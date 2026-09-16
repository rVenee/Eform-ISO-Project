from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, asc, desc
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models, schemas, security
from auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["User Management (Admin IT)"])

def check_admin_access(current_user: models.User):
    if current_user.role != "admin_it":
        raise HTTPException(status_code=403, detail="Akses ditolak. Fitur ini khusus Admin IT.")
    
class PasswordReset(BaseModel):
    password: str

VALID_SORT_COLUMNS = {
    "full_name": models.User.full_name,
    "section": models.User.section,
    "division": models.User.division,
    "role": models.User.role,
}

# 1. Endpoint untuk Melihat Semua User (dengan Search, Filter, Sort, Pagination)
@router.get("/", response_model=schemas.PaginatedUserResponse)
def get_all_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    division: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: str = "asc",
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    check_admin_access(current_user)

    query = db.query(models.User)

    if search:
        query = query.filter(
            or_(
                models.User.full_name.ilike(f"%{search}%"),
                models.User.username.ilike(f"%{search}%"),
                models.User.section.ilike(f"%{search}%"),
            )
        )
    if role and role != "all":
        query = query.filter(models.User.role == role)
    if division and division != "all":
        query = query.filter(models.User.division == division)

    if sort_by in VALID_SORT_COLUMNS:
        column = VALID_SORT_COLUMNS[sort_by]
        query = query.order_by(desc(column) if sort_dir == "desc" else asc(column))
    else:
        query = query.order_by(models.User.user_id.asc())

    total_items = query.count()

    users = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": users,
        "total_items": total_items,
        "total_pages": (total_items + page_size - 1) // page_size,
        "current_page": page
    }

# 1b. Endpoint untuk Daftar Divisi Unik (dipakai dropdown filter, terpisah dari pagination)
@router.get("/divisions", response_model=list[str])
def get_distinct_divisions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    check_admin_access(current_user)
    rows = db.query(models.User.division).filter(models.User.division.isnot(None)).distinct().order_by(models.User.division).all()
    return [r[0] for r in rows]

# 2. Endpoint untuk Tambah User Baru (Khusus Admin)
@router.post("/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    check_admin_access(current_user)
    
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Kata sandi minimal 6 karakter")
    
    existing_user = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username sudah terdaftar")
    
    hashed_password = security.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        full_name=user.full_name,
        section=user.section,
        division=user.division,
        role=user.role,
        password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# 3. Endpoint untuk Edit User
@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int, 
    user_update: schemas.UserUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    check_admin_access(current_user)
    
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    if user_update.full_name:
        user.full_name = user_update.full_name
    if user_update.role:
        user.role = user_update.role
    if user_update.section is not None:
        user.section = user_update.section
    if user_update.division is not None:
        user.division = user_update.division
    if user_update.password:
        user.password = security.get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(user)
    return user

# 4. Endpoint Khusus Reset Password
@router.put("/{user_id}/reset-password")
def reset_password(
    user_id: int, 
    payload: PasswordReset, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    check_admin_access(current_user)
    
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password baru minimal 6 karakter")

    user.password = security.get_password_hash(payload.password)
    db.commit()
    return {"message": "Kata sandi berhasil direset"}

# 5. Endpoint untuk Menghapus User
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    check_admin_access(current_user)
    
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    if user.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Anda tidak dapat menghapus akun Anda sendiri.")

    if user.role == "admin_it":
        remaining_admin_it = db.query(models.User).filter(models.User.role == "admin_it").count()
        if remaining_admin_it <= 1:
            raise HTTPException(status_code=400, detail="Tidak dapat menghapus Admin IT terakhir yang tersisa di sistem.")
        
    db.delete(user)
    db.commit()
    return {"message": "User berhasil dihapus"}