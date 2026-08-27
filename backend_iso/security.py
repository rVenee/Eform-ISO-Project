import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

# Muat variabel dari file .env
load_dotenv()

# Konfigurasi Kunci Rahasia JWT dari .env
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("CRITICAL ERROR: SECRET_KEY belum di-set di file .env!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")) # Token akan kedaluwarsa dalam 1 jam

# Konfigurasi Bcrypt untuk enkripsi password
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Fungsi untuk mengecek apakah password yang diketik sama dengan password acak di database
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Fungsi untuk mengacak password sebelum masuk ke database
def get_password_hash(password):
    return pwd_context.hash(password)

# Fungsi untuk membuat Token Digital (Tiket Masuk)
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt