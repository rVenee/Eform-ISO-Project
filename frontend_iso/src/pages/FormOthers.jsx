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

  // State Form Others (Dirampingkan)
  const [formData, setFormData] = useState({
    title: '',
    type_iso_doc: '',
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
              title: metadata.title || '',
              type_iso_doc: metadata.category || '', 
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
    const validExtensions = ['doc', 'docx'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const validMimeTypes = [
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!validExtensions.includes(fileExtension) && !validMimeTypes.includes(file.type)) {
      alert("Format file ditolak! Harap unggah dokumen dalam format Word (.doc atau .docx).");
      return;
    }

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
      // TAHAP 1: Metadata Utama
      const metadataPayload = {
        category: formData.type_iso_doc, 
        title: formData.title || `Dokumen ${formData.type_iso_doc}`, 
        document_number: "",
        creator_name: "",
        approved_by: "",
        effective_date: null,
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
        fileName: formData.fileName
      };

      await apiClient.post(`/documents/${currentDocId}/contents`, {
        form_data: jsonPayload
      });

      // TAHAP 3: Upload File Fisik
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Type ISO Doc. <span className="text-red-500">*</span></label>
                  <select 
                    value={formData.type_iso_doc} 
                    onChange={(e) => handleChange('type_iso_doc', e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863] appearance-none bg-white cursor-pointer" 
                    required
                  >
                    <option value="" disabled>Pilih Kategori</option>
                    
                    <optgroup label="Dokumen Utama (Manual Upload)">
                      <option value="QM">QM</option>
                      <option value="SOP">SOP</option>
                      <option value="FM_FR">FM/FR</option>
                    </optgroup>
                    
                    <optgroup label="Dokumen Lainnya">
                      <option value="NCR">NCR</option>
                      <option value="DOP">DOP</option>
                      <option value="JB">JB</option>
                      <option value="TM">TM</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Judul Dokumen <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={formData.title} 
                    onChange={(e) => handleChange('title', e.target.value)} 
                    placeholder="Masukkan judul spesifik dokumen..." 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" 
                    required 
                  />
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
              <p className="text-sm text-gray-400 mb-6">Unggah file dokumen ISO dalam format Word (.doc, .docx)</p>

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
                  <input type="file" className="hidden" onChange={handleFileInput} accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
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