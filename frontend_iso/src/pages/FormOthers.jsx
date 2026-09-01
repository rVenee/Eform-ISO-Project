import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Info, X, Send, CheckCircle2, AlertCircle, UploadCloud, FileText } from 'lucide-react';
import apiClient from '../api/axios';

export default function FormOthers() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // State Form Others
  const [formData, setFormData] = useState({
    document_no: '',
    document_date: '',
    section: '',
    author: '',
    type_form_iso: '',
    type_iso_doc: '',
    approver: '',
    last_approver: '',
    initiator: '',
    file: null,
    fileName: ''
  });

  // Tarik Data (Hanya untuk Mode Edit)
  useEffect(() => {
    if (id) {
      const fetchDocument = async () => {
        try {
          const response = await apiClient.get(`/documents/${id}/detail`);
          const { metadata, isi_form } = response.data;
          
          if (isi_form) {
            setFormData({
              document_no: metadata.document_number || '',
              document_date: metadata.effective_date || '',
              section: isi_form.section || '',
              author: metadata.creator_name || '',
              type_form_iso: isi_form.type_form_iso || '',
              type_iso_doc: metadata.category || '', // Ambil dari category NCR/DOP/dll
              approver: metadata.approved_by || '',
              last_approver: isi_form.last_approver || '',
              initiator: isi_form.initiator || '',
              file: null, 
              fileName: isi_form.fileName || '' 
            });
          }
        } catch (error) {
          setStatus({ type: 'error', message: 'Gagal memuat data dokumen untuk diedit.' });
        }
      };
      fetchDocument();
    }
  }, [id]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- HANDLER DRAG & DROP FILE ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = (file) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("Ukuran file melebihi batas maksimal 10MB.");
      return;
    }
    setFormData(prev => ({ ...prev, file: file, fileName: file.name }));
  };

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setStatus({ type: '', message: '' });

    let currentDocId = id;

    try {
      // TAHAP 1: Metadata Utama (Kategori dinamis & Tidak ada draft)
      const metadataPayload = {
        category: formData.type_iso_doc, 
        title: `Dokumen ${formData.type_iso_doc}`, 
        document_number: formData.document_no,
        creator_name: formData.author,
        approved_by: formData.approver,
        effective_date: formData.document_date || null,
        status: 'Menunggu'
      };

      if (id) {
        await apiClient.put(`/documents/${id}`, metadataPayload);
      } else {
        const docRes = await apiClient.post('/documents/', metadataPayload);
        currentDocId = docRes.data.document_id;
      }

      // TAHAP 2: Simpan Sisa Form ke JSON
      const jsonPayload = {
        section: formData.section,
        type_form_iso: formData.type_form_iso,
        last_approver: formData.last_approver,
        initiator: formData.initiator,
        fileName: formData.fileName
      };

      await apiClient.post(`/documents/${currentDocId}/contents`, {
        form_data: jsonPayload
      });

      // TAHAP 3: Upload File Fisik (Hanya jika ada file baru)
      if (formData.file) {
        const fileData = new FormData();
        fileData.append('subchapter_reference', 'Attachment_Utama_Others');
        fileData.append('file', formData.file);
        
        await apiClient.post(`/documents/${currentDocId}/attachments`, fileData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setStatus({ type: 'success', message: 'Dokumen berhasil diajukan ke Unit ISO!' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      setTimeout(() => {
        setIsLoading(false);
        navigate('/dashboard');
      }, 1500);

    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Gagal mengirim dokumen ke server.' 
      });
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 relative">
      <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-8 md:p-12">
        
        {status.message && (
          <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 font-medium text-sm border ${status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {status.message}
          </div>
        )}

        <form>
          {/* Informasi Umum */}
          <div className="flex items-start gap-4 mb-10">
            <div className="w-10 h-10 rounded-full bg-[#f0f7f7] text-[#126863] flex items-center justify-center shrink-0 mt-1">
              <Info size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1 w-full">
              <h2 className="text-[22px] font-bold text-[#126863] leading-none mb-1">Informasi Umum</h2>
              <p className="text-sm text-gray-400 mb-8">Informasi mengenai dokumen</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Document No. <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.document_no} onChange={(e) => handleChange('document_no', e.target.value)} placeholder="Placeholder" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Document Date <span className="text-red-500">*</span></label>
                  <input type="date" value={formData.document_date} onChange={(e) => handleChange('document_date', e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863] text-gray-500" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Section <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.section} onChange={(e) => handleChange('section', e.target.value)} placeholder="Placeholder" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Author <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.author} onChange={(e) => handleChange('author', e.target.value)} placeholder="Placeholder" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Type Form ISO <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.type_form_iso} onChange={(e) => handleChange('type_form_iso', e.target.value)} placeholder="Placeholder" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" required />
                </div>
                
                {/* Dropdown Type ISO Doc */}
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Type ISO Doc. <span className="text-red-500">*</span></label>
                  <select 
                    value={formData.type_iso_doc} 
                    onChange={(e) => handleChange('type_iso_doc', e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863] appearance-none bg-white cursor-pointer" 
                    required
                  >
                    <option value="" disabled>Pilih Kategori</option>
                    <option value="NCR">NCR</option>
                    <option value="DOP">DOP</option>
                    <option value="JB">JB</option>
                    <option value="TM">TM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Approver <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.approver} onChange={(e) => handleChange('approver', e.target.value)} placeholder="Placeholder" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Last Approver <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.last_approver} onChange={(e) => handleChange('last_approver', e.target.value)} placeholder="Placeholder" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Initiator <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.initiator} onChange={(e) => handleChange('initiator', e.target.value)} placeholder="Placeholder" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" required />
                </div>
              </div>
            </div>
          </div>

          <hr className="my-10 border-gray-200" />

          {/* Upload Dokumen */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#f0f7f7] text-[#126863] flex items-center justify-center shrink-0 mt-1">
              <UploadCloud size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1 w-full">
              <h2 className="text-[22px] font-bold text-[#126863] leading-none mb-1">Upload Dokumen (Attachment)</h2>
              <p className="text-sm text-gray-400 mb-6">Unggah file dokumen ISO dalam format PDF atau Word</p>

              {!formData.fileName ? (
                <label 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${isDragging ? 'border-[#126863] bg-[#f0f7f7]' : 'border-gray-300 hover:border-[#126863] bg-gray-50 hover:bg-[#f0f7f7]'}`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud size={40} className="text-[#126863] mb-4" />
                    <p className="mb-2 text-sm font-bold text-gray-700">Klik untuk mengunggah atau seret file ke sini</p>
                    <p className="text-xs text-gray-500">Maksimal ukuran file 10MB</p>
                  </div>
                  <input type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.doc,.docx" />
                </label>
              ) : (
                <div className="flex items-center justify-between p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="p-3 bg-[#f0f7f7] text-[#126863] rounded-xl">
                      <FileText size={24} />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-bold text-gray-800 truncate">{formData.fileName}</p>
                      <p className="text-xs text-[#126863] font-medium mt-0.5">Siap diunggah</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, file: null, fileName: '' }))} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions - Draft Dihapus */}
          <div className="flex justify-end gap-4 mt-16 pt-8 border-t border-gray-200">
            <button 
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={isLoading || !formData.type_iso_doc || !formData.fileName}
              className="flex items-center gap-2 px-6 py-3.5 bg-[#126863] text-white rounded-xl font-bold text-sm hover:bg-[#0d4f4c] shadow-sm transition-colors disabled:opacity-70"
            >
              <Send size={18} strokeWidth={2.5} />
              Submit ke Unit ISO
            </button>
          </div>
        </form>
      </div>

      {/* Modal Konfirmasi */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[20px] w-full max-w-md p-7 shadow-2xl">
            <h3 className="text-xl font-black text-[#126863] mb-3">Konfirmasi Pengiriman</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Dokumen akan masuk ke antrean <strong>Unit ISO</strong> dan tidak dapat diedit kembali kecuali statusnya dikembalikan menjadi Direvisi.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowConfirm(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Batal</button>
              <button type="button" onClick={(e) => { setShowConfirm(false); handleSubmit(e); }} className="px-5 py-2.5 text-sm font-bold text-white bg-[#126863] rounded-xl hover:bg-[#0d4f4c] shadow-sm transition-colors">
                Ya, Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )} 
      
      {/* Overlay Loading Global */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="w-14 h-14 border-4 border-[#126863]/20 border-t-[#126863] rounded-full animate-spin mb-4"></div>
          <h3 className="text-lg font-bold text-[#126863]">Menyimpan Dokumen...</h3>
        </div>
      )}
    </div>
  );
}