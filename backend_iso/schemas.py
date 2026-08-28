from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from datetime import date, datetime
from typing import Optional, Dict, Any
from enum import Enum

class RoleEnum(str, Enum):
    admin_iso = "admin_iso"
    user = "user"

# ========================================
# SCHEMAS UNTUK USERS
# ========================================
class UserBase(BaseModel):
    username: str
    full_name: str
    role: RoleEnum

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

# ========================================
# SCHEMAS UNTUK DOCUMENT CONTENTS (ISI FORM)
# ========================================
class DocumentContentBase(BaseModel):
    form_data: Dict[str, Any]

class DocumentContentCreate(DocumentContentBase):
    pass

class DocumentContentResponse(DocumentContentBase):
    content_id: int
    document_id: int

    class Config:
        from_attributes = True

# ========================================
# SCHEMAS UNTUK DOCUMENTS ATTACHMENTS
# ========================================
class AttachmentResponse(BaseModel):
    attachment_id: int
    document_id: int
    subchapter_reference: str
    file_path: str
    upload_date: datetime

    class Config:
        from_attributes = True

# ========================================
# SCHEMAS UNTUK WORKFLOW & REVISION LOGS
# ========================================
class DocumentReview(BaseModel):
    status: str 
    document_number: Optional[str] = None
    revision_number: Optional[str] = None
    effective_date: Optional[date] = None
    notes: Optional[str] = None # Untuk catatan revisi jika ditolak

class RevisionLogResponse(BaseModel):
    log_id: int
    document_id: int
    reviewer_id: int
    notes: str
    date_create: datetime

    class Config:
        from_attributes = True

# ========================================
# SCHEMAS UNTUK MANAJEMEN USER (ADMIN IT)
# ========================================
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[RoleEnum] = None
    password: Optional[str] = None