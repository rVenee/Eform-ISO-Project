from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from database import get_db
from typing import Optional
from datetime import date
from sqlalchemy import or_
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
# Ambil dari .env
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")

# Inisialisasi router untuk dokumen
router = APIRouter(prefix="/documents", tags=["Documents"])

# Fungsi Helper untuk Menentukan Rute Awal Dokumen
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
    # CEGAT LOGIKA ROUTING DI SINI
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
        status=incoming_status # Gunakan status yang sudah dicegat
    )
    
    db.add(new_document)
    db.commit()
    db.refresh(new_document)
    
    return new_document

# 2. Endpoint untuk Melihat Daftar Dokumen (Read dengan Filter & Pencarian)
@router.get("/", response_model=list[schemas.DocumentResponse])
def get_all_documents(
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Document)
    
    # --- LAPIS KEAMANAN RBAC (VISIBILITAS DATA) ---
    if current_user.role == schemas.RoleEnum.admin_iso:
        # Admin ISO melihat semua dokumen KECUALI yang masih Draft
        query = query.filter(models.Document.status != 'Draft')
        
    elif current_user.role in [
        schemas.RoleEnum.division_head, 
        schemas.RoleEnum.qmr_emr, 
        schemas.RoleEnum.mr, 
        schemas.RoleEnum.hrd, 
        schemas.RoleEnum.mill_head
    ]:
        # Pimpinan Atas melihat: Dokumen dari seksinya SENDIRI + Dokumen yang MENUNGGU persetujuannya
        status_target = {
            "division_head": "Menunggu Division Head",
            "qmr_emr": "Menunggu QMR",
            "mr": "Menunggu MR",
            "hrd": "Menunggu HRD",
            "mill_head": "Menunggu Mill Head"
        }.get(current_user.role)
        
        query = query.join(models.User, models.Document.user_id == models.User.user_id).filter(
            or_(
                models.User.section == current_user.section,
                models.Document.status == status_target
            )
        )
    else:
        # Applicator & Unit Head HANYA melihat dokumen dari SEKSI YANG SAMA
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

    documents = query.order_by(models.Document.updated_date.desc()).all()
    return documents

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
    
    # CEGAT LOGIKA ROUTING SAAT UPDATE DARI DRAFT KE SUBMIT
    if update_data.get('status') == "Menunggu":
        # Ambil kategori dari update_data jika diubah, atau dari database jika tetap
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
        # WORKAROUND: SQLAlchemy tidak mendeteksi perubahan in-place pada kolom JSON
        # (mutable tracking gagal), jadi update dipaksa lewat query eksplisit.
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
        
    # Bersihkan nama file dari spasi agar URL aman
    safe_filename = file.filename.replace(" ", "_")
    file_name = f"doc{document_id}_{safe_filename}"
    file_path = f"uploads/{file_name}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"{BASE_URL}/uploads/{file_name}"
    
    # Simpan rekam jejak ke database (Tabel DOCUMENTS_ATTACHMENTS)
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
    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokumen tidak ditemukan")

    if not document.checked_date:
        document.checked_date = date.today()

    document.status = review_data.status
    
    if review_data.status == "Disetujui":
        document.document_number = review_data.document_number
        document.revision_number = review_data.revision_number
        document.effective_date = review_data.effective_date
        document.approved_date = date.today()
        
    elif review_data.status == "Direvisi":
        if not review_data.notes:
            raise HTTPException(status_code=400, detail="Catatan revisi wajib diisi jika dokumen ditolak")
            
        # Simpan jejak catatan penolakan ke tabel REVISION_LOGS
        new_log = models.RevisionLog(
            document_id=document_id,
            reviewer_id=current_user.user_id,
            notes=review_data.notes
        )
        db.add(new_log)
        
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
        
        # 1. MAPPING METADATA DOKUMEN
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
        
        # 2. MAPPING TEXT DASAR
        context["tujuan_instruksi"] = raw_context.get("tujuan", "-")
        context["ruang_lingkup_instruksi"] = raw_context.get("ruang_lingkup", "-")

        # 3. MAPPING LANGKAH KERJA
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

        # 4. MAPPING KESEHATAN & KESELAMATAN
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

        # 5. MAPPING DOKUMEN TERKAIT
        dokumen_terkait_formatted = []
        for i, doc in enumerate(raw_context.get("dokumen_terkait", [])):
            dokumen_terkait_formatted.append({
                "nomor_subbab": f"5.{i + 1}",
                "nomor_dokumen": doc.get("nomor", ""),
                "job_desk": doc.get("deskripsi", "")
            })
        context["dokumen_terkait"] = dokumen_terkait_formatted

        # 6. INISIALISASI TEMPLATE
        template_path = "templates/template_wi.docx"
        doc = DocxTemplate(template_path)
        
        # 7. MAPPING LAMPIRAN & GAMBAR DINAMIS
        lampiran_data = raw_context.get("lampiran", [])
        if not lampiran_data or len(lampiran_data) == 0:
            # Jika kosong, kirim teks N/A dan kosongkan daftar_lampiran
            context["teks_lampiran"] = "- N/A"
            context["daftar_lampiran"] = [] 
        else:
            # Jika ada isinya, kosongkan teks N/A dan proses gambarnya
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

        # 8. RENDER & SIMPAN
        doc.render(context)
        temp_docx_name = f"doc_{document_id}_temp.docx"
        temp_docx_path = f"uploads/{temp_docx_name}"
        doc.save(temp_docx_path)

    else:
        # LOGIKA DOKUMEN OTHERS / MANUAL UPLOAD
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

    # KONVERSI PDF UNTUK KEDUANYA
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
    document = db.query(models.Document).filter(
        models.Document.document_id == document_id
    ).with_for_update().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")

    # Jika lolos masuk tetapi ternyata dokumen baru saja dikunci admin lain sepersekian detik yang lalu
    if document.status == "Direview" and document.locked_by and document.locked_by != current_user.user_id:
        raise HTTPException(status_code=400, detail="Gagal! Dokumen baru saja diambil oleh admin lain.")

    document.status = "Direview"
    document.locked_by = current_user.user_id
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

    # HANYA pemegang kunci yang berhak melepas kunci!
    if document.locked_by == current_user.user_id:
        if document.status == "Direview":
            document.status = "Menunggu"
            
        document.locked_by = None
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
    
    # A. Jika yang klik adalah UNIT HEAD
    if document.status == "Menunggu Unit Head" and current_user.role == "unit_head":
        document.checked_by = current_user.full_name
        document.checked_date = date.today()
        # Setelah Unit Head ACC, dokumen diteruskan ke Unit ISO untuk format & penomoran
        document.status = "Menunggu ISO"
        
    # B. Jika yang klik adalah DIVISION HEAD
    elif document.status == "Menunggu Division Head" and current_user.role == "division_head":
        document.approved_by = current_user.full_name
        document.approved_date = date.today()
        
        # Penentuan Destinasi berdasarkan Kategori Dokumen
        if document.category in ['WI', 'DOP', 'TM', 'CM', 'QMS_SP']:
            document.status = "Disetujui" # Div Head adalah approver terakhir
        elif document.category == 'JB':
            document.status = "Menunggu HRD"
        elif document.category in ['EII', 'EMS']:
            document.status = "Menunggu MR"
        else:
            document.status = "Disetujui" # Fallback
            
    # C. Jika yang klik adalah QMR / EMR
    elif document.status == "Menunggu QMR" and current_user.role == "qmr_emr":
        document.checked_by = current_user.full_name # Bertindak sebagai pemeriksa
        document.checked_date = date.today()
        document.status = "Menunggu MR"

    # D. Jika yang klik adalah MR (Management Representative)
    elif document.status == "Menunggu MR" and current_user.role == "mr":
        document.approved_by = current_user.full_name
        document.approved_date = date.today()
        document.status = "Disetujui"

    # E. Jika yang klik adalah MILL HEAD
    elif document.status == "Menunggu Mill Head" and current_user.role == "mill_head":
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
    review_data: schemas.DocumentReview, # Memanfaatkan schema review yang sama dengan ISO
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")

    if not review_data.notes:
        raise HTTPException(status_code=400, detail="Catatan penolakan (notes) wajib diisi!")

    # Kembalikan ke status Direvisi agar Applicator bisa memperbaiki
    document.status = "Direvisi"
    
    # Catat alasan penolakan di tabel REVISION_LOGS
    new_log = models.RevisionLog(
        document_id=document_id,
        reviewer_id=current_user.user_id,
        notes=f"[{current_user.role.upper()}] " + review_data.notes
    )
    db.add(new_log)
    db.commit()
    db.refresh(document)
    
    return document