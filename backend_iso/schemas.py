from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import date, datetime
from enum import Enum

class RoleEnum(str, Enum):
    admin_iso = "admin_iso"
    admin_it = "admin_it"
    applicator = "applicator"
    unit_head = "unit_head"
    division_head = "division_head"
    qmr = "qmr"
    emr = "emr"
    enmr = "enmr"
    smr = "smr"
    kahi = "kahi"
    mr = "mr"
    hrd = "hrd"
    mill_head = "mill_head"

# ========================================
# SCHEMAS UNTUK AUTHENTICATION
# ========================================
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str

# ========================================
# SCHEMAS UNTUK USERS
# ========================================
class UserBase(BaseModel):
    username: str
    full_name: str
    section: Optional[str] = None
    division: Optional[str] = None
    role: RoleEnum

class UserCreate(UserBase):
    password: str 

class UserResponse(UserBase):
    user_id: int

    class Config:
        from_attributes = True 

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[RoleEnum] = None
    section: Optional[str] = None
    division: Optional[str] = None
    password: Optional[str] = None

class PaginatedUserResponse(BaseModel):
    items: list[UserResponse]
    total_items: int
    total_pages: int
    current_page: int

# ========================================
# SCHEMAS UNTUK DOCUMENTS
# ========================================
class DocumentBase(BaseModel):
    category: str
    target_specialist: Optional[str] = None
    title: str
    creator_name: Optional[str] = None
    checked_by: Optional[str] = None
    approved_by: Optional[str] = None
    document_number: Optional[str] = None
    revision_number: Optional[str] = None
    effective_date: Optional[date] = None
    status: Optional[str] = None

class DocumentCreate(DocumentBase):
    pass 

class DocumentUpdate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    document_id: int
    user_id: int
    author_name: Optional[str] = None
    created_date: datetime
    updated_date: datetime
    locked_by: Optional[int] = None
    locked_at: Optional[datetime] = None
    locked_by_name: Optional[str] = None
    first_check_viewed_by: Optional[int] = None
    first_check_viewer_name: Optional[str] = None
    last_revision_by_role: Optional[str] = None
    last_revision_by: Optional[str] = None
    creator_section: Optional[str] = None

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

class PaginatedDocumentResponse(BaseModel):
    items: list[DocumentResponse]
    total_items: int
    total_pages: int
    current_page: int

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
    notes: Optional[str] = None 

class RevisionLogResponse(BaseModel):
    log_id: int
    document_id: int
    reviewer_id: int
    reviewer_name: Optional[str] = None
    notes: str
    date_create: datetime

    class Config:
        from_attributes = True