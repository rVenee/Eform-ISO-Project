import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle, Download, UploadCloud, FileText, X, Check } from 'lucide-react';
import apiClient from '../api/axios';

let strictModeTimeout;

export default function ReviewDokumen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // State Form Administrasi (Penamaan disamakan dengan API)
  const [formData, setFormData] = useState({
    document_number: '',
    revision_number: '',
    effective_date: '',
    checked_by: '',
    approved_by: '',
    final_pdf_file: null, 
    final_pdf_name: ''
  });

  // State Modal Revisi
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');

  // State Modal Preview Final
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [finalPdfUrl, setFinalPdfUrl] = useState('');
  const [isGeneratingFinal, setIsGeneratingFinal] = useState(false);

  useEffect(() => {
    if (strictModeTimeout) clearTimeout(strictModeTimeout);

    const fetchDocumentData = async () => {
      try {
        const res = await apiClient.get(`/documents/${id}/detail`);
        setDocument(res.data.metadata);

        const revRes = await apiClient.get(`/documents/${id}/revisions`);
        const totalRevisions = revRes.data ? revRes.data.length : 0;
        const formattedRevision = totalRevisions.toString().padStart(2, '0');

        // PERBAIKAN BUG VALIDASI: Menggunakan key yang selaras
        setFormData(prev => ({
          ...prev,
          document_number: res.data.metadata.document_number || '',
          revision_number: formattedRevision, 
          effective_date: res.data.metadata.effective_date || '',
          checked_by: res.data.metadata.checked_by || '',
          approved_by: res.data.metadata.approved_by || ''
        }));

        const category = res.data.metadata.category?.toUpperCase();
        if (['WI'].includes(category)) {
          const pdfRes = await apiClient.get(`/documents/${id}/export`, { responseType: 'blob' });
          const url = URL.createObjectURL(pdfRes.data);
          setPdfUrl(url);
        }
      } catch (error) {
        navigate('/admin');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDocumentData();

    const handleTabClose = () => {
      const token = localStorage.getItem('token');
      fetch(`http://localhost:8000/documents/${id}/unlock`, {
        method: 'PUT',
        keepalive: true,
        headers: { 'Authorization': `Bearer ${token}` }
      });
    };
    window.addEventListener('beforeunload', handleTabClose);

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      if (finalPdfUrl) URL.revokeObjectURL(finalPdfUrl);
      window.removeEventListener('beforeunload', handleTabClose); 
      strictModeTimeout = setTimeout(() => {
        apiClient.put(`/documents/${id}/unlock`).catch(() => {});
      }, 500);
    };
  }, [id]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setFormData(prev => ({ ...prev, final_pdf_file: file, final_pdf_name: file.name }));
    } else {
      alert("Harap unggah file dalam format PDF.");
    }
  };

  const isOthersDocument = document && document.category?.toUpperCase() !== 'WI';

  // --- API HANDLERS ---

  const handleCancelReview = async () => {
    try {
      await apiClient.put(`/documents/${id}/unlock`);
      navigate('/admin');
    } catch (error) {
      navigate('/admin'); 
    }
  };

  // FUNGSI 1: Mempersiapkan Pratinjau Final
  const handlePrepareFinalPreview = async () => {
    if (!formData.document_number || !formData.revision_number || !formData.effective_date || !formData.checked_by || !formData.approved_by) {
      alert("Harap lengkapi seluruh Detail Administrasi (Bintang Merah) sebelum menyetujui dokumen.");
      return;
    }

    if (isOthersDocument && !formData.final_pdf_file) {
      alert("Untuk dokumen eksternal, Anda wajib mengunggah File PDF Final yang sudah dicap/ditandatangani.");
      return;
    }

    setIsGeneratingFinal(true);
    try {
      // Simpan sementara detail administrasi ke backend agar PDF baru terisi
      await apiClient.put(`/documents/${id}`, {
        category: document.category,
        title: document.title,
        document_number: formData.document_number,
        revision_number: formData.revision_number,
        effective_date: formData.effective_date,
        checked_by: formData.checked_by,
        approved_by: formData.approved_by,
        status: 'Direview' // Biarkan status tetap direview
      });

      if (isOthersDocument) {
        // Jika upload manual, langsung jadikan file lokal sebagai preview
        const url = URL.createObjectURL(formData.final_pdf_file);
        setFinalPdfUrl(url);
      } else {
        // Tarik ulang PDF yang sudah di-update dengan data administrasi baru
        const pdfRes = await apiClient.get(`/documents/${id}/export`, { responseType: 'blob' });
        const url = URL.createObjectURL(pdfRes.data);
        setFinalPdfUrl(url);
      }

      setShowFinalModal(true);
    } catch (error) {
      alert("Gagal memuat pratinjau final dokumen.");
    } finally {
      setIsGeneratingFinal(false);
    }
  };

  // FUNGSI 2: Eksekusi Persetujuan Final (Setelah Admin yakin dengan Preview)
  const handleFinalApprove = async () => {
    setIsLoading(true);
    setShowFinalModal(false);
    
    try {
      // Jika dokumen manual (Others), kirim file PDF-nya ke backend
      if (isOthersDocument && formData.final_pdf_file) {
        const fileData = new FormData();
        fileData.append('subchapter_reference', 'Final_PDF_Approved');
        fileData.append('file', formData.final_pdf_file);
        await apiClient.post(`/documents/${id}/attachments`, fileData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      await apiClient.put(`/documents/${id}/review`, {
        status: 'Disetujui',
        document_number: formData.document_number,
        revision_number: formData.revision_number,
        effective_date: formData.effective_date
      });

      navigate('/admin');
    } catch (error) {
      alert("Terjadi kesalahan saat memproses persetujuan.");
      setIsLoading(false);
    }
  };

  const handleSubmitRevision = async () => {
    if (!revisionNotes.trim()) {
      alert("Catatan revisi wajib diisi!");
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.put(`/documents/${id}/review`, {
        status: 'Direvisi',
        notes: revisionNotes
      });
      navigate('/admin');
    } catch (error) {
      alert("Gagal mengirim catatan revisi.");
      setIsLoading(false);
    }
  };

  if (isLoading && !document) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin w-10 h-10 border-4 border-[#126863] border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col relative">
      <button onClick={handleCancelReview} className="flex items-center gap-2 text-gray-500 hover:text-[#126863] w-fit mb-4 font-medium transition-colors">
        <ArrowLeft size={18} /> Kembali ke Dashboard
      </button>

      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
        
        {/* KOLOM KIRI: PREVIEW ATAU OTHERS WORKFLOW */}
        <div className="flex-[2] bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-[500px]">
          {isOthersDocument ? (
            <div className="p-10 flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                <FileText size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Dokumen Eksternal ({document.category})</h2>
              <p className="text-gray-500 max-w-md mb-8">
                Dokumen ini tidak menggunakan E-Form. Silakan unduh dokumen mentah (Word), lengkapi secara manual, ubah menjadi PDF, lalu unggah kembali versi finalnya.
              </p>
              
              <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors mb-10">
                <Download size={18} /> Unduh Dokumen Mentah (Word)
              </button>

              <div className="w-full max-w-md">
                <h3 className="text-sm font-bold text-gray-700 mb-3 text-left">Unggah PDF Final</h3>
                {!formData.final_pdf_name ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 hover:border-[#126863] bg-gray-50 hover:bg-[#f0f7f7] rounded-xl cursor-pointer transition-colors">
                    <UploadCloud size={28} className="text-[#126863] mb-2" />
                    <span className="text-sm font-medium text-gray-600">Pilih file PDF final</span>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-[#f0f7f7] border border-[#126863]/30 rounded-xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText size={20} className="text-[#126863] shrink-0" />
                      <span className="text-sm font-bold text-[#126863] truncate">{formData.final_pdf_name}</span>
                    </div>
                    <button onClick={() => setFormData(prev => ({ ...prev, final_pdf_file: null, final_pdf_name: '' }))} className="text-gray-400 hover:text-red-500">
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-gray-700">Preview E-Form PDF</h3>
              </div>
              <div className="flex-1 bg-gray-100 p-2">
                {pdfUrl ? (
                  <iframe 
                    src={`${pdfUrl}#toolbar=0`} 
                    className="w-full h-full rounded-xl border border-gray-300 shadow-inner" 
                    title="PDF Preview" 
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 font-medium">Memuat pratinjau...</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* KOLOM KANAN: FORM DETAIL ADMINISTRASI */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col min-w-[320px] overflow-y-auto">
          <h3 className="text-lg font-bold text-[#126863] mb-6">Detail Administrasi</h3>
          
          <div className="space-y-4 mb-8 flex-1">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Nomor Dokumen <span className="text-red-500">*</span></label>
              <input type="text" value={formData.document_number} onChange={(e) => handleInputChange('document_number', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#126863] focus:border-[#126863] outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Revisi (Otomatis)</label>
              <input 
                type="text" 
                value={formData.revision_number} 
                readOnly 
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Tanggal Efektif <span className="text-red-500">*</span></label>
              <input type="date" value={formData.effective_date} onChange={(e) => handleInputChange('effective_date', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#126863] focus:border-[#126863] outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Diperiksa Oleh <span className="text-red-500">*</span></label>
              <input type="text" value={formData.checked_by} onChange={(e) => handleInputChange('checked_by', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#126863] focus:border-[#126863] outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Disetujui Oleh <span className="text-red-500">*</span></label>
              <input type="text" value={formData.approved_by} onChange={(e) => handleInputChange('approved_by', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#126863] focus:border-[#126863] outline-none" required />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-100 shrink-0">
            <button 
              onClick={handlePrepareFinalPreview} 
              disabled={isLoading || isGeneratingFinal} 
              className="w-full flex items-center justify-center gap-2 bg-[#126863] hover:bg-[#0d4f4c] text-white font-bold py-3 rounded-xl transition-colors shadow-sm disabled:opacity-70"
            >
              {isGeneratingFinal ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <><CheckCircle2 size={18} /> Preview & Approve PDF</>
              )}
            </button>
            <button onClick={() => setShowRevisionModal(true)} disabled={isLoading || isGeneratingFinal} className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold py-3 rounded-xl transition-colors disabled:opacity-70">
              <RotateCcw size={18} /> Kembalikan untuk Revisi
            </button>
            <button onClick={handleCancelReview} disabled={isLoading || isGeneratingFinal} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm disabled:opacity-70">
              <XCircle size={18} /> Batalkan Review
            </button>
          </div>
        </div>
      </div>

      {/* =========================================
          MODAL PREVIEW FINAL (ELEGANT FULLSCREEN)
      ========================================= */}
      {showFinalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
          <div className="bg-white w-full max-w-6xl h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-lg font-black text-[#126863]">Pratinjau Dokumen Final</h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Pastikan detail administrasi (Kop Surat) sudah terisi dengan benar sebelum disetujui.</p>
              </div>
              <button onClick={() => setShowFinalModal(false)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>

            {/* Iframe PDF */}
            <div className="flex-1 bg-gray-200 p-2 md:p-6 overflow-hidden">
              {finalPdfUrl ? (
                <iframe src={finalPdfUrl} className="w-full h-full rounded-xl shadow-md border border-gray-300 bg-white" title="Final PDF Preview" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-[#126863]/20 border-t-[#126863] rounded-full animate-spin mb-4"></div>
                  <p className="text-[#126863] font-bold">Memuat Pratinjau Final...</p>
                </div>
              )}
            </div>

            {/* Footer Aksi */}
            <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end gap-3">
              <button 
                onClick={() => setShowFinalModal(false)} 
                className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleFinalApprove} 
                className="flex items-center gap-2 px-8 py-2.5 text-sm font-bold text-white bg-[#126863] rounded-xl hover:bg-[#0d4f4c] shadow-md transition-colors"
              >
                <Check size={18} strokeWidth={3} /> Ya, Setujui Dokumen
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================
          MODAL REVISI
      ========================================= */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[24px] w-full max-w-lg p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-[#126863] mb-2">Pengembalian untuk Revisi</h3>
            <p className="text-sm text-gray-500 mb-6">Berikan catatan revisi untuk pengaju sebagai informasi</p>
            
            <textarea 
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Tulis disini..." 
              className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#126863]/50 focus:border-[#126863] resize-none mb-6"
            ></textarea>
            
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRevisionModal(false)} className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <XCircle size={16} /> Batal
              </button>
              <button onClick={handleSubmitRevision} className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#126863] rounded-xl hover:bg-[#0d4f4c] shadow-sm transition-colors">
                <RotateCcw size={16} /> Kirim Revisi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}