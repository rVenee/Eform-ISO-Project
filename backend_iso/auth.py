from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from database import get_db
import models, schemas, security

# Inisialisasi router untuk endpoint autentikasi
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Skema keamanan untuk memberitahu Swagger UI letak endpoint login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Endpoint untuk mendaftarkan pengguna baru (Developer/Admin IT)
@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Cek apakah username sudah ada
    existing_user = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username sudah terdaftar!")
    
    # Acak password
    hashed_password = security.get_password_hash(user.password)
    
    # Buat dan simpan user baru
    new_user = models.User(
        username=user.username,
        password=hashed_password,
        full_name=user.full_name,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

# Endpoint untuk login dan mendapatkan Token JWT
@router.post("/login")
def login(user_credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Cari user di database
    user = db.query(models.User).filter(models.User.username == user_credentials.username).first()
    
    # Cek kecocokan username dan password
    if not user or not security.verify_password(user_credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Username atau password salah!",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Buat Token JWT
    access_token = security.create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    
    # Kembalikan token beserta info user untuk frontend
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_info": {
            "username": user.username,
            "role": user.role,
            "full_name": user.full_name
        }
    }

# Fungsi untuk mengekstrak dan memvalidasi user dari Token JWT
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesi telah habis atau token tidak valid",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Bongkar token
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Cari user di database untuk memastikan akun masih aktif
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
        
    return user