from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from datetime import date, datetime
from typing import Optional

# ========================================
# SCHEMAS UNTUK USERS
# ========================================
class UserBase(BaseModel):
    username: str
    full_name: str
    role: str

class UserCreate(UserBase):
    password: str # Password wajib saat membuat user

class UserResponse(UserBase):
    user_id: int

    class Config:
        from_attributes = True # Penting: Agar FastAPI bisa menerjemahkan model SQLAlchemy ke JSON

# ========================================
# SCHEMAS UNTUK DOCUMENTS
# ========================================
class DocumentBase(BaseModel):
    category: str
    title: str
    creator_name: Optional[str] = None
    checked_by: Optional[str] = None
    approved_by: Optional[str] = None
    document_number: Optional[str] = None
    revision_number: Optional[str] = None
    effective_date: Optional[date] = None

class DocumentCreate(DocumentBase):
    pass # Digunakan saat endpoint "Create Document" ditembak dari frontend

class DocumentResponse(DocumentBase):
    document_id: int
    user_id: int
    status: str
    created_date: datetime
    updated_date: datetime

    class Config:
        from_attributes = True

# ========================================
# SCHEMAS UNTUK DOCUMENTS (METADATA)
# ========================================

class DocumentCreate(BaseModel):
    category: str
    title: str
    creator_name: str
    checked_by: Optional[str] = None
    approved_by: Optional[str] = None
    document_number: str
    revision_number: str
    effective_date: date

class DocumentUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    creator_name: Optional[str] = None
    checked_by: Optional[str] = None
    approved_by: Optional[str] = None
    document_number: Optional[str] = None
    revision_number: Optional[str] = None
    effective_date: Optional[date] = None

class DocumentResponse(DocumentCreate):
    document_id: int
    user_id: int
    status: str
    created_date: datetime
    updated_date: datetime

    class Config:
        from_attributes = True