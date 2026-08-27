from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import get_current_user

# Inisialisasi router untuk dokumen
router = APIRouter(prefix="/documents", tags=["Documents"])

# 1. Endpoint untuk Membuat Dokumen Baru (Create)
@router.post("/", response_model=schemas.DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    doc: schemas.DocumentCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    new_document = models.Document(
        category=doc.category,
        title=doc.title,
        creator_name=doc.creator_name,
        checked_by=doc.checked_by,
        approved_by=doc.approved_by,
        document_number=doc.document_number,
        revision_number=doc.revision_number,
        effective_date=doc.effective_date,
        user_id=current_user.user_id, # Otomatis terikat ke user yang sedang login
        status="Draft"                # Status awal otomatis Draft
    )
    
    db.add(new_document)
    db.commit()
    db.refresh(new_document)
    
    return new_document

# 2. Endpoint untuk Melihat Semua Daftar Dokumen (Read)
@router.get("/", response_model=list[schemas.DocumentResponse])
def get_all_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    documents = db.query(models.Document).all()
    return documents