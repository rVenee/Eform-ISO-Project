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

# 3. Endpoint untuk Memperbarui Dokumen (Update - Partial)
@router.put("/{document_id}", response_model=schemas.DocumentResponse)
def update_document(
    document_id: int, 
    doc_update: schemas.DocumentUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Cari dokumen berdasarkan ID
    document_query = db.query(models.Document).filter(models.Document.document_id == document_id)
    document = document_query.first()
    
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokumen tidak ditemukan")
        
    # Hanya ambil data yang benar-benar dikirim/diisi oleh user (agar tidak error 422)
    update_data = doc_update.model_dump(exclude_unset=True)
    
    document_query.update(update_data, synchronize_session=False)
    db.commit()
    
    return document_query.first()

# 4. Endpoint untuk Menghapus Dokumen (Delete)
@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Cari dokumen berdasarkan ID
    document_query = db.query(models.Document).filter(models.Document.document_id == document_id)
    document = document_query.first()
    
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokumen tidak ditemukan")
        
    document_query.delete(synchronize_session=False)
    db.commit()
    
    return {"message": "Dokumen berhasil dihapus"}