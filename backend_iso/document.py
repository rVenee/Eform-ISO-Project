from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import get_current_user
import os
import shutil

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

# 5. Endpoint untuk Menyimpan/Memperbarui Isi Form Dokumen (JSON)
@router.post("/{document_id}/contents", response_model=schemas.DocumentContentResponse)
def save_document_content(
    document_id: int,
    content: schemas.DocumentContentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Pastikan dokumen induknya ada
    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokumen tidak ditemukan")

    # Cek apakah sudah ada isinya
    existing_content = db.query(models.DocumentContent).filter(models.DocumentContent.document_id == document_id).first()
    
    if existing_content:
        existing_content.form_data = content.form_data
        db.commit()
        db.refresh(existing_content)
        return existing_content
    else:
        new_content = models.DocumentContent(
            document_id=document_id,
            form_data=content.form_data
        )
        db.add(new_content)
        db.commit()
        db.refresh(new_content)
        return new_content

# 6. Endpoint untuk Melihat Detail 1 Dokumen Beserta Isinya
@router.get("/{document_id}/detail")
def get_document_detail(
    document_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Ambil metadata
    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokumen tidak ditemukan")
        
    # Ambil isi form
    content = db.query(models.DocumentContent).filter(models.DocumentContent.document_id == document_id).first()
    
    # Gabungkan untuk frontend
    return {
        "metadata": document,
        "isi_form": content.form_data if content else None
    }

# Pastikan folder 'uploads' otomatis terbuat jika belum ada di server
os.makedirs("uploads", exist_ok=True)

# 7. Endpoint untuk Mengunggah Lampiran File (Attachment)
@router.post("/{document_id}/attachments")
def upload_attachment(
    document_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Cek ketersediaan dokumen induk
    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokumen tidak ditemukan")
        
    # Bersihkan nama file dari spasi agar URL aman
    safe_filename = file.filename.replace(" ", "_")
    file_name = f"doc{document_id}_{safe_filename}"
    file_path = f"uploads/{file_name}"
    
    # Simpan file secara fisik ke folder uploads
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Kembalikan link URL agar bisa diakses Frontend
    file_url = f"http://127.0.0.1:8000/uploads/{file_name}"
    
    return {
        "filename": file.filename,
        "file_url": file_url,
        "message": "File berhasil diunggah"
    }