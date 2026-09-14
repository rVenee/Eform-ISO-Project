from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
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

# 1. Endpoint untuk Melihat Semua User
@router.get("/", response_model=list[schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    check_admin_access(current_user)
    return db.query(models.User).all()

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

    # Cegah admin_it menghapus dirinya sendiri
    if user.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Anda tidak dapat menghapus akun Anda sendiri.")

    # Cegah menghapus admin_it terakhir yang tersisa di sistem
    if user.role == "admin_it":
        remaining_admin_it = db.query(models.User).filter(models.User.role == "admin_it").count()
        if remaining_admin_it <= 1:
            raise HTTPException(status_code=400, detail="Tidak dapat menghapus Admin IT terakhir yang tersisa di sistem.")
        
    db.delete(user)
    db.commit()
    return {"message": "User berhasil dihapus"}