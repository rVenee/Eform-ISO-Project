from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from database import get_db
from typing import Optional
from datetime import date, datetime, timedelta
from sqlalchemy import or_, and_
from fastapi.responses import FileResponse
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
from docx2pdf import convert
from auth import get_current_user
from dotenv import load_dotenv
import models, schemas
import os
import shutil
import pythoncom
import json

load_dotenv()
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")

router = APIRouter(prefix="/documents", tags=["Documents"])

AUTO_TIMEOUT_MINUTES = 30

# Label status resmi untuk role Pimpinan Spesialis (dipakai di visibility filter & approve engine
# supaya string status selalu konsisten di seluruh file)
ROLE_STATUS_LABEL = {
    "qmr": "QMR",
    "emr": "EMR",
    "enmr": "EnMR",
    "smr": "SMR",
    "kahi": "KAHI",
    "mr": "MR",
}

def determine_initial_status(category: str) -> str:
    if category in ['WI', 'JB', 'QMS', 'TM', 'EMS', 'CM', 'QMS_SP']:
        return "Menunggu Unit Head"
    elif category in ['DOP', 'EII']:
        return "Menunggu Division Head"
    elif category == 'SOP':
        return "Menunggu ISO"
    return "Menunggu ISO"

# 1. Endpoint untuk Membuat Dokumen Baru (Create)
@router.post("/", response_model=schemas.DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    doc: schemas.DocumentCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    incoming_status = doc.status if doc.status else "Draft"
    if incoming_status == "Menunggu":
        incoming_status = determine_initial_status(doc.category)

    new_document = models.Document(
        category=doc.category,
        title=doc.title,
        creator_name=doc.creator_name if doc.creator_name else current_user.full_name,
        checked_by=doc.checked_by,
        approved_by=doc.approved_by,
        document_number=doc.document_number,
        revision_number=doc.revision_number,
        effective_date=doc.effective_date,
        prepared_date=date.today(),
        user_id=current_user.user_id,
        status=incoming_status
    )
    
    db.add(new_document)
    db.commit()
    db.refresh(new_document)
    
    return new_document

# 2. Endpoint untuk Melihat Daftar Dokumen (Read dengan Filter & Pencarian)
@router.get("/", response_model=schemas.PaginatedDocumentResponse)
def get_all_documents(
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    mode: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Document)
    
    # --- LAPIS KEAMANAN RBAC (VISIBILITAS DATA) ---
    
    if current_user.role == schemas.RoleEnum.admin_iso:
        query = query.filter(models.Document.status != 'Draft')
        
    elif current_user.role == schemas.RoleEnum.division_head:
        query = query.join(models.User, models.Document.user_id == models.User.user_id).filter(
            models.User.division == current_user.division
        ).filter(models.Document.status.notin_(['Draft', 'Menunggu Unit Head']))

    # 1. Blok Pimpinan Spesialis (QMR/EMR/EnMR/SMR/KAHI/MR) — TANPA Mill Head
    elif current_user.role in [
        schemas.RoleEnum.qmr, schemas.RoleEnum.emr, schemas.RoleEnum.enmr,
        schemas.RoleEnum.smr, schemas.RoleEnum.kahi, schemas.RoleEnum.mr
    ]:
        role_categories = {
            "qmr": ["QM", "SOP", "WI", "FM_FR"],
            "emr": ["EMS"],
            "enmr": ["EII"],
            "smr": ["DOP", "JB"],
            "kahi": ["TM"],
            "mr": ["QM", "SOP", "WI", "FM_FR", "EMS", "EII"],
        }
        target_categories = role_categories.get(current_user.role, [])
        status_target = f"Menunggu {ROLE_STATUS_LABEL.get(current_user.role, current_user.role)}"

        query = query.filter(
            or_(
                models.Document.category.in_(target_categories),
                models.Document.status == status_target
            )
        ).filter(models.Document.status != 'Draft')

    # 2. Blok Mill Head — terpisah, dibatasi divisi (MHO / MHO P)
    elif current_user.role == schemas.RoleEnum.mill_head:
        query = query.join(models.User, models.Document.user_id == models.User.user_id).filter(
            models.User.division == current_user.division,
            or_(
                models.Document.category == "QMS",
                models.Document.status == "Menunggu Mill Head"
            )
        ).filter(models.Document.status != 'Draft')

    elif current_user.role == schemas.RoleEnum.unit_head:
        query = query.join(models.User, models.Document.user_id == models.User.user_id).filter(
            and_(models.User.section == current_user.section, models.User.division == current_user.division)
        ).filter(models.Document.status != 'Draft')
        
    elif current_user.role == schemas.RoleEnum.hrd:
        query = query.join(models.User, models.Document.user_id == models.User.user_id).filter(
            or_(
                models.User.division == current_user.division,
                models.Document.category == "JB",
                models.Document.status == "Menunggu HRD"
            )
        ).filter(models.Document.status != 'Draft')
        
    else: # Applicator
        query = query.join(models.User, models.Document.user_id == models.User.user_id)\
                     .filter(models.User.section == current_user.section)
                     
    # --- APLIKASI FILTER ---
    if category:
        query = query.filter(models.Document.category == category)
    if status:
        query = query.filter(models.Document.status == status)
    if search:
        query = query.filter(
            or_(
                models.Document.title.ilike(f"%{search}%"),
                models.Document.document_number.ilike(f"%{search}%")
            )
        )
    if start_date:
        query = query.filter(models.Document.created_date >= start_date)
    if end_date:
        query = query.filter(models.Document.created_date <= end_date)

    role_target_statuses = {
        "qmr": ["Menunggu QMR"],
        "emr": ["Menunggu EMR"],
        "enmr": ["Menunggu EnMR"],
        "smr": ["Menunggu SMR"],
        "kahi": ["Menunggu KAHI"],
        "mr": ["Menunggu MR"],
        "unit_head": ["Menunggu Unit Head"],
        "division_head": ["Menunggu Division Head"],
        "hrd": ["Menunggu HRD", "Menunggu Division Head"],
        "mill_head": ["Menunggu Mill Head"],
    }
    target_statuses = role_target_statuses.get(current_user.role, [])

    if mode == "pending" and target_statuses:
        query = query.filter(models.Document.status.in_(target_statuses))
    elif mode == "all" and target_statuses:
        query = query.filter(models.Document.status.notin_(target_statuses))

    total_items = query.count()
    
    documents = query.order_by(models.Document.updated_date.desc())\
                      .offset((page - 1) * page_size)\
                      .limit(page_size)\
                      .all()

    return {
        "items": documents,
        "total_items": total_items,
        "total_pages": (total_items + page_size - 1) // page_size,
        "current_page": page
    }

# 3. Endpoint untuk Memperbarui Dokumen (Update - Partial)
@router.put("/{document_id}", response_model=schemas.DocumentResponse)
def update_document(
    document_id: int, 
    doc_update: schemas.DocumentUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    document_query = db.query(models.Document).filter(models.Document.document_id == document_id)
    document = document_query.first()
    
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokumen tidak ditemukan")
        
    update_data = doc_update.model_dump(exclude_unset=True)
    
    if update_data.get('status') == "Menunggu":
        cat = update_data.get('category', document.category)
        update_data['status'] = determine_initial_status(cat)
    
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
    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokumen tidak ditemukan")

    existing_content = db.query(models.DocumentContent).filter(models.DocumentContent.document_id == document_id).first()
    
    if existing_content:
        db.query(models.DocumentContent).filter(models.DocumentContent.document_id == document_id).update(
            {"form_data": content.form_data}, synchronize_session=False
        )
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
    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokumen tidak ditemukan")
        
    content = db.query(models.DocumentContent).filter(models.DocumentContent.document_id == document_id).first()

    return {
        "metadata": document,
        "isi_form": content.form_data if content else None
    }

# 7. Endpoint untuk Mengunggah Lampiran File (Attachment)
@router.post("/{document_id}/attachments", response_model=schemas.AttachmentResponse)
def upload_attachment(
    document_id: int,
    subchapter_reference: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokumen tidak ditemukan")
        
    safe_filename = file.filename.replace(" ", "_")
    file_name = f"doc{document_id}_{safe_filename}"
    file_path = f"uploads/{file_name}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"{BASE_URL}/uploads/{file_name}"
    
    new_attachment = models.DocumentAttachment(
        document_id=document_id,
        subchapter_reference=subchapter_reference,
        file_path=file_url
    )
    db.add(new_attachment)
    db.commit()
    db.refresh(new_attachment)
    
    return new_attachment

# 8. Endpoint untuk Review Dokumen (Admin ISO)
@router.put("/{document_id}/review", response_model=schemas.DocumentResponse)
def review_document(
    document_id: int,
    review_data: schemas.DocumentReview,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "admin_iso":
        raise HTTPException(status_code=403, detail="Akses ditolak. Hanya Unit ISO yang dapat melakukan review dokumen.")

    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokumen tidak ditemukan")

    if document.status != "Direview":
        raise HTTPException(status_code=400, detail="Dokumen ini tidak sedang dalam proses review Anda.")

    if document.locked_by != current_user.user_id:
        raise HTTPException(status_code=403, detail="Dokumen ini sedang dikunci oleh Admin ISO lain.")

    if review_data.status not in ("Disetujui", "Direvisi"):
        raise HTTPException(status_code=400, detail="Status review tidak valid.")

    document.checked_by = current_user.full_name
    if not document.checked_date:
        document.checked_date = date.today()

    document.status = review_data.status
    
    if review_data.status == "Disetujui":
        document.document_number = review_data.document_number
        document.revision_number = review_data.revision_number
        document.effective_date = review_data.effective_date
        document.approved_date = date.today()
        document.locked_by = None
        document.locked_at = None
        
    elif review_data.status == "Direvisi":
        if not review_data.notes:
            raise HTTPException(status_code=400, detail="Catatan revisi wajib diisi jika dokumen ditolak")
        new_log = models.RevisionLog(
            document_id=document_id,
            reviewer_id=current_user.user_id,
            notes=review_data.notes
        )
        db.add(new_log)
        document.locked_by = None
        document.locked_at = None
        
    db.commit()
    db.refresh(document)
    
    return document

# 9. Endpoint untuk Melihat Riwayat Revisi Dokumen
@router.get("/{document_id}/revisions", response_model=list[schemas.RevisionLogResponse])
def get_revision_logs(
    document_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    logs = db.query(models.RevisionLog).filter(models.RevisionLog.document_id == document_id).order_by(models.RevisionLog.date_create.desc()).all()
    return logs

# 10. Endpoint untuk Mencetak Dokumen Final (Otomatis Convert Word ke PDF)
@router.get("/{document_id}/export")
def export_document_pdf(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")

    temp_docx_path = ""

    if document.category == 'WI':
        content = db.query(models.DocumentContent).filter(models.DocumentContent.document_id == document_id).first()
        if not content:
            raise HTTPException(status_code=404, detail="Isi form E-Form tidak ditemukan")

        raw_data = content.form_data
        if isinstance(raw_data, str):
            try:
                raw_context = json.loads(raw_data)
            except:
                raw_context = {}
        else:
            raw_context = raw_data.copy() if raw_data else {}
        
        context = {}
        
        context["judul_instruksi"] = document.title if document.title else "-"
        context["nomor_dokumen"] = document.document_number if document.document_number else "-"
        context["nomor_revisi"] = document.revision_number if document.revision_number else "-"
        context["tanggal_efektif"] = document.effective_date.strftime("%d-%m-%Y") if document.effective_date else "-"
        
        context["disiapkan_oleh"] = document.creator_name if document.creator_name else "-"
        context["diperiksa_oleh"] = document.checked_by if document.checked_by else "-"
        context["disetujui_oleh"] = document.approved_by if document.approved_by else "-"
        
        context["tanggal_disiapkan"] = document.prepared_date.strftime("%d-%m-%Y") if document.prepared_date else "-"
        context["tanggal_diperiksa"] = document.checked_date.strftime("%d-%m-%Y") if document.checked_date else "-"
        context["tanggal_disetujui"] = document.approved_date.strftime("%d-%m-%Y") if document.approved_date else "-"
        
        context["tujuan_instruksi"] = raw_context.get("tujuan", "-")
        context["ruang_lingkup_instruksi"] = raw_context.get("ruang_lingkup", "-")

        langkah_kerja_formatted = []
        for i, langkah in enumerate(raw_context.get("langkah_kerja", [])):
            bagian = {
                "nomor_subbab": f"3.{i + 1}",
                "judul_subbab": langkah.get("deskripsi", ""),
                "daftar_poin": []
            }
            for j, sub in enumerate(langkah.get("sub_langkah", [])):
                bagian["daftar_poin"].append({
                    "nomor_poin": f"3.{i + 1}.{j + 1}",
                    "deskripsi": sub.get("deskripsi", "")
                })
            langkah_kerja_formatted.append(bagian)
        context["langkah_kerja"] = langkah_kerja_formatted

        poin_kesehatan = []
        for i, item in enumerate(raw_context.get("kesehatan_kerja", [])):
            poin_kesehatan.append({
                "nomor": f"4.1.{i + 1}",
                "deskripsi": item.get("deskripsi", "")
            })
        context["poin_kesehatan"] = poin_kesehatan

        poin_keselamatan = []
        for i, item in enumerate(raw_context.get("keselamatan_kerja", [])):
            poin_keselamatan.append({
                "nomor": f"4.2.{i + 1}",
                "deskripsi": item.get("deskripsi", "")
            })
        context["poin_keselamatan"] = poin_keselamatan

        dokumen_terkait_formatted = []
        for i, doc in enumerate(raw_context.get("dokumen_terkait", [])):
            dokumen_terkait_formatted.append({
                "nomor_subbab": f"5.{i + 1}",
                "nomor_dokumen": doc.get("nomor", ""),
                "job_desk": doc.get("deskripsi", "")
            })
        context["dokumen_terkait"] = dokumen_terkait_formatted

        template_path = "templates/template_wi.docx"
        doc = DocxTemplate(template_path)
        
        lampiran_data = raw_context.get("lampiran", [])
        if not lampiran_data or len(lampiran_data) == 0:
            context["teks_lampiran"] = "- N/A"
            context["daftar_lampiran"] = [] 
        else:
            context["teks_lampiran"] = ""
            daftar_lampiran_formatted = []
            for i, lamp in enumerate(lampiran_data):
                ref_subbab = f"6.{i + 1} {lamp.get('judul', '')}"
                lamp_item = {
                    "nomor_subbab": f"6.{i + 1}",
                    "judul_lampiran": lamp.get("judul", ""),
                    "objek_media": "[Tidak ada file lampiran]"
                }
                
                attachment = db.query(models.DocumentAttachment).filter(
                    models.DocumentAttachment.document_id == document_id,
                    models.DocumentAttachment.subchapter_reference == ref_subbab
                ).first()
                
                if attachment:
                    local_image_path = attachment.file_path.split("8000/")[-1]
                    if os.path.exists(local_image_path):
                        lamp_item["objek_media"] = InlineImage(doc, local_image_path, width=Mm(150))
                    else:
                        lamp_item["objek_media"] = "[Gambar fisik hilang]"
                        
                daftar_lampiran_formatted.append(lamp_item)
            context["daftar_lampiran"] = daftar_lampiran_formatted

        doc.render(context)
        temp_docx_name = f"doc_{document_id}_temp.docx"
        temp_docx_path = f"uploads/{temp_docx_name}"
        doc.save(temp_docx_path)

    else:
        attachment = db.query(models.DocumentAttachment).filter(
            models.DocumentAttachment.document_id == document_id,
            models.DocumentAttachment.subchapter_reference == 'Attachment_Utama_Others'
        ).first()

        if not attachment:
            raise HTTPException(status_code=404, detail="Dokumen fisik tidak ditemukan untuk dipratinjau")

        local_docx_path = attachment.file_path.split("8000/")[-1]
        if not os.path.exists(local_docx_path):
            raise HTTPException(status_code=404, detail="File fisik hilang dari server")
            
        temp_docx_path = local_docx_path

    final_pdf_name = f"doc_{document_id}_final.pdf"
    final_pdf_path = f"uploads/{final_pdf_name}"
    
    try:
        pythoncom.CoInitialize()
        convert(temp_docx_path, final_pdf_path)
    finally:
        pythoncom.CoUninitialize()

    if document.category == 'WI' and os.path.exists(temp_docx_path):
        os.remove(temp_docx_path)

    return FileResponse(
        path=final_pdf_path, 
        filename=final_pdf_name, 
        media_type='application/pdf'
    )

# 11. Endpoint untuk Mengunci Dokumen (Lock) saat diklik "Review"
@router.put("/{document_id}/lock", response_model=schemas.DocumentResponse)
def lock_document(
    document_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "admin_iso":
        raise HTTPException(status_code=403, detail="Akses ditolak. Hanya Unit ISO yang dapat mereview dokumen.")

    document = db.query(models.Document).filter(
        models.Document.document_id == document_id
    ).with_for_update().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")

    if document.status not in ("Menunggu ISO", "Direview"):
        raise HTTPException(status_code=400, detail="Dokumen ini bukan berada di antrean Unit ISO.")

    lock_expired = (
        document.locked_at is not None and
        datetime.utcnow() - document.locked_at > timedelta(minutes=AUTO_TIMEOUT_MINUTES)
    )

    if document.status == "Direview" and document.locked_by and document.locked_by != current_user.user_id and not lock_expired:
        raise HTTPException(status_code=400, detail="Gagal! Dokumen sedang direview oleh admin lain.")

    document.status = "Direview"
    document.locked_by = current_user.user_id
    document.locked_at = datetime.utcnow()
    db.commit()
    db.refresh(document)
    
    return document

# 12. Endpoint untuk Membuka Kunci Dokumen (Unlock) saat "Batalkan Review"
@router.put("/{document_id}/unlock", response_model=schemas.DocumentResponse)
def unlock_document(
    document_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")

    if document.locked_by == current_user.user_id:
        if document.status == "Direview":
            document.status = "Menunggu ISO"
            
        document.locked_by = None
        document.locked_at = None   # BARU
        db.commit()
        db.refresh(document)
        
    return document

# 13. Endpoint untuk Persetujuan Pimpinan (Approve Workflow Engine)
@router.put("/{document_id}/approve", response_model=schemas.DocumentResponse)
def approve_document_by_leader(
    document_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")

    # --- ENGINE ROUTING BERDASARKAN ROLE & STATUS ---
    
    # A. UNIT HEAD
    if document.status == "Menunggu Unit Head" and current_user.role == "unit_head":
        document.checked_by = current_user.full_name
        document.checked_date = date.today()
        document.status = "Menunggu ISO"
        
    # B. DIVISION HEAD
    elif document.status == "Menunggu Division Head" and current_user.role == "division_head":
        document.approved_by = current_user.full_name
        document.approved_date = date.today()
        
        if document.category in ['WI', 'DOP', 'TM', 'CM', 'QMS_SP']:
            document.status = "Disetujui"
        elif document.category == 'QMS':
            document.status = "Menunggu Mill Head"
        elif document.category == 'JB':
            document.status = "Menunggu HRD"
        elif document.category in ['EII', 'EMS']:
            document.status = "Menunggu MR"
        else:
            document.status = "Disetujui"
            
    # C. QMR / EMR / EnMR / SMR / KAHI
    elif current_user.role in ROLE_STATUS_LABEL and document.status == f"Menunggu {ROLE_STATUS_LABEL[current_user.role]}" and current_user.role != "mr":
        document.checked_by = current_user.full_name
        document.checked_date = date.today()
        document.status = "Menunggu MR"

    # D. MR (Management Representative)
    elif document.status == "Menunggu MR" and current_user.role == "mr":
        document.approved_by = current_user.full_name
        document.approved_date = date.today()
        document.status = "Disetujui"

    # E. MILL HEAD — divalidasi harus divisi yang sama dengan pengaju dokumen
    elif document.status == "Menunggu Mill Head" and current_user.role == "mill_head":
        owner = db.query(models.User).filter(models.User.user_id == document.user_id).first()
        if not owner or owner.division != current_user.division:
            raise HTTPException(status_code=403, detail="Akses ditolak. Dokumen ini bukan dari divisi Anda.")
        document.approved_by = current_user.full_name
        document.approved_date = date.today()
        document.status = "Disetujui"
        
    else:
        raise HTTPException(status_code=403, detail="Akses ditolak. Dokumen ini tidak sedang berada di antrean persetujuan Anda.")

    db.commit()
    db.refresh(document)
    return document


# 14. Endpoint untuk Penolakan Pimpinan (Reject / Kembalikan ke Revisi)
@router.put("/{document_id}/reject", response_model=schemas.DocumentResponse)
def reject_document_by_leader(
    document_id: int, 
    review_data: schemas.DocumentReview,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")

    if not review_data.notes:
        raise HTTPException(status_code=400, detail="Catatan penolakan (notes) wajib diisi!")

    document.status = "Direvisi"
    
    new_log = models.RevisionLog(
        document_id=document_id,
        reviewer_id=current_user.user_id,
        notes=f"[{current_user.role.upper()}] " + review_data.notes
    )
    db.add(new_log)
    db.commit()
    db.refresh(document)
    
    return document