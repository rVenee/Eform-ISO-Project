from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, security
from auth import get_current_user

router = APIRouter(prefix="/users", tags=["User Management (Admin IT)"])

def check_admin_access(current_user: models.User):
    if current_user.role not in ["admin_it", "admin_iso"]: 
        raise HTTPException(status_code=403, detail="Akses ditolak. Fitur ini khusus Admin.")

# 1. Endpoint untuk Melihat Semua User
@router.get("/", response_model=list[schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    check_admin_access(current_user)
    return db.query(models.User).all()

# 2. Endpoint untuk Edit User & Reset Password
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
    if user_update.password:
        user.password = security.get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(user)
    return user

# 3. Endpoint untuk Menghapus User
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    check_admin_access(current_user)
    
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
        
    db.delete(user)
    db.commit()
    return {"message": "User berhasil dihapus"}