import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Search, ClipboardCheck, GitBranch, ChevronDown, Download, Eye, Plus, Pencil, LayoutGrid, FileText, Folder, Trash2, X, Lightbulb, Loader2 } from 'lucide-react';
import apiClient from '../api/axios';

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // State untuk Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State untuk Preview Dokumen
  const [pdfUrl, setPdfUrl] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const navigate = useNavigate();

  // State untuk Modal Catatan Revisi
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [selectedRevisionDoc, setSelectedRevisionDoc] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState(null);
  const [isLoadingRevision, setIsLoadingRevision] = useState(false);

  // State untuk melacak ID dokumen yang sedang diunduh
  const [downloadingId, setDownloadingId] = useState(null);

  // Auto-fetch dengan Debounce & Background Polling (5 Detik)
  useEffect(() => {
    const fetchFilteredDocuments = async (isBackground = false) => {
      if (!isBackground) setIsLoading(true); // Hanya munculkan loading jika bukan dari polling
      try {
        const params = {};
        if (searchQuery) params.search = searchQuery;
        if (category) params.category = category;
        if (statusFilter) params.status = statusFilter;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const response = await apiClient.get('/documents', { params }); 
        setDocuments(response.data);
      } catch (err) {
        setError('Gagal memuat data riwayat dokumen.');
      } finally {
        if (!isBackground) setIsLoading(false);
      }
    };

    // 1. Eksekusi awal / saat filter berubah (menggunakan debounce 500ms)
    const delayDebounceFn = setTimeout(() => {
      fetchFilteredDocuments(false);
    }, 500);

    // 2. Eksekusi polling latar belakang (setiap 5000ms / 5 detik)
    const pollingInterval = setInterval(() => {
      fetchFilteredDocuments(true); // true = abaikan animasi loading
    }, 5000);

    // 3. Bersihkan memori saat komponen di-unmount atau filter berubah
    return () => {
      clearTimeout(delayDebounceFn);
      clearInterval(pollingInterval);
    };
  }, [searchQuery, category, statusFilter, startDate, endDate]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategory('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'disetujui': return 'bg-[#d1fae5] text-[#065f46]';
      case 'menunggu': return 'bg-[#fef3c7] text-[#92400e]';
      case 'direvisi': return 'bg-[#fee2e2] text-[#b91c1c]';
      case 'direview': return 'bg-[#dbeafe] text-[#1e40af]';
      case 'draft': return 'bg-gray-100 text-gray-600 border border-gray-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Logika Render Ikon Spesifik Kategori
  const getCategoryIcon = (cat) => {
    switch (cat?.toUpperCase()) {
      case 'WI': return <ClipboardCheck size={18} className="text-[#126863]" />;
      case 'SOP': return <GitBranch size={18} className="text-[#126863]" />;
      case 'QM': return <FileText size={18} className="text-[#126863]" />;
      case 'FM_FR': return <Folder size={18} className="text-[#126863]" />;
      default: return <LayoutGrid size={18} className="text-[#126863]" />; 
    }
  };

  const handleDelete = async (docId) => {
    const confirmDelete = window.confirm("Apakah Anda yakin ingin menghapus dokumen ini secara permanen?");
    if (!confirmDelete) return;

    try {
      await apiClient.delete(`/documents/${docId}`);
      setDocuments(prevDocs => prevDocs.filter(doc => doc.document_id !== docId));
    } catch (error) {
      alert("Gagal menghapus dokumen. Pastikan server merespons dengan benar.");
    }
  };

  const handlePreview = async (docId) => {
    setIsPreviewOpen(true);
    setIsLoadingPreview(true);
    try {
      const res = await apiClient.get(`/documents/${docId}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      setPdfUrl(url);
    } catch (error) {
      alert("Gagal memuat pratinjau dokumen. Pastikan file terlampir dengan benar.");
      setIsPreviewOpen(false);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const closePreview = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl('');
    setIsPreviewOpen(false);
  };

  const handleDownload = async (doc) => {
    setDownloadingId(doc.document_id); // Aktifkan loading untuk ID ini
    
    try {
      const res = await apiClient.get(`/documents/${doc.document_id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${doc.title || 'Dokumen_ISO'}.pdf`);
      
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Gagal mengunduh dokumen. Pastikan server merespons dengan benar.");
    } finally {
      setDownloadingId(null); // Matikan loading
    }
  };

  // Handler saat tombol Edit (Pencil) diklik
  const handleEditClick = async (doc) => {
    if (doc.status?.toLowerCase() === 'draft') {
      // Jika Draft, langsung arahkan ke halaman edit
      const path = ['NCR', 'DOP', 'JB', 'TM'].includes(doc.category?.toUpperCase()) ? `/others/${doc.document_id}` : `/wi/${doc.document_id}`;
      navigate(path);
    } else if (doc.status?.toLowerCase() === 'direvisi') {
      // Jika Direvisi, buka modal dan tarik catatan revisi dari backend
      setSelectedRevisionDoc(doc);
      setIsRevisionModalOpen(true);
      setIsLoadingRevision(true);
      try {
        const res = await apiClient.get(`/documents/${doc.document_id}/revisions`);
        if (res.data && res.data.length > 0) {
          // Ambil log revisi yang paling baru (indeks 0)
          setRevisionNotes(res.data[0]);
        } else {
          setRevisionNotes({ notes: "Tidak ada catatan revisi spesifik.", date_create: doc.updated_date });
        }
      } catch (error) {
        setRevisionNotes({ notes: "Gagal memuat catatan revisi.", date_create: new Date() });
      } finally {
        setIsLoadingRevision(false);
      }
    }
  };

  // Handler untuk melanjutkan ke halaman form setelah membaca catatan
  const handleProceedToEdit = () => {
    if (!selectedRevisionDoc) return;
    const path = ['NCR', 'DOP', 'JB', 'TM'].includes(selectedRevisionDoc.category?.toUpperCase()) 
      ? `/others/${selectedRevisionDoc.document_id}` 
      : `/wi/${selectedRevisionDoc.document_id}`;
    navigate(path);
  };

  return (
    <div className="max-w-6xl mx-auto">
      
      {/* Header Teks & Tombol Buat Dokumen */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <p className="text-gray-500 text-sm max-w-2xl leading-relaxed">
          Daftar dokumen ISO yang pernah Anda buat beserta statusnya. Lihat pratinjau langsung dari sini, edit jika status direvisi, dan unduh untuk melihat document final dengan format pdf.
        </p>
        <Link 
          to="/form-wi" 
          className="px-5 py-2.5 bg-[#126863] hover:bg-[#0d4f4c] text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
        >
          <Plus size={18} strokeWidth={3} /> Buat Dokumen Baru
        </Link>
      </div>

      {/* Box Filter Lengkap */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 mb-4">
        
        {/* Row 1: Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-gray-400">
            <Search size={18} strokeWidth={2} />
          </span>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan Judul atau No. Dokumen..." 
            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863] text-gray-700 placeholder-gray-400"
          />
        </div>

        {/* Row 2: Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <div className="relative">
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#126863] appearance-none bg-white cursor-pointer"
              >
                <option value="">All Categories</option>
                <option value="WI">Work Instruction (WI)</option>
                <option value="SOP">Standard Operating Procedure (SOP)</option>
                <option value="QM">Quality Manual (QM)</option>
                <option value="FM_FR">Form / Record (FM_FR)</option>
                <optgroup label="Others">
                  <option value="NCR">NCR</option>
                  <option value="DOP">DOP</option>
                  <option value="JB">JB</option>
                  <option value="TM">TM</option>
                </optgroup>
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <div className="relative">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#126863] appearance-none bg-white cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Menunggu">Menunggu</option>
                <option value="Direview">Direview</option>
                <option value="Direvisi">Direvisi</option>
                <option value="Disetujui">Disetujui</option>
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 3: Dates & Reset */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">From date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#126863] bg-white cursor-pointer" 
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">To date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#126863] bg-white cursor-pointer" 
            />
          </div>
          <button 
            onClick={handleResetFilters}
            className="w-full md:w-40 px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors h-[42px] shrink-0"
          >
            Reset filters
          </button>
        </div>
      </div>

      {/* Pesan Error */}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 mb-4">
          {error}
        </div>
      )}

      {/* Tabel Data */}
      <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm overflow-x-auto min-h-[300px] relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#126863]/20 border-t-[#126863] rounded-full animate-spin"></div>
          </div>
        )}

        <table className="w-full text-sm text-center min-w-[800px]">
          <thead className="bg-[#f4f6f8] text-[#8c949c] text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-5 py-4 rounded-tl-[20px]">Kategori Dokumen</th>
              <th className="px-5 py-4">Judul</th>
              <th className="px-5 py-4">No. Dokumen</th>
              <th className="px-5 py-4 text-center">Status</th>
              <th className="px-5 py-4">Diperbarui</th>
              <th className="px-5 py-4 text-center rounded-tr-[20px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
            
            {documents.length === 0 && !isLoading ? (
              <tr>
                <td colSpan="6" className="px-5 py-10 text-gray-400">Tidak ada dokumen yang sesuai dengan filter.</td>
              </tr>
            ) : (
              documents.map((doc, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center justify-center gap-3">
                      {getCategoryIcon(doc.category)}
                      <span className="w-24 text-left">{doc.category || 'Dokumen'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-900 align-middle">
                    <div className="max-w-[200px] lg:max-w-[300px] mx-auto whitespace-normal break-words text-center">
                      {doc.title}
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <div className="max-w-[150px] mx-auto whitespace-normal break-words text-center">
                      {doc.document_number || '-'}
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex justify-center">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold w-24 inline-block text-center shadow-sm ${getStatusStyle(doc.status)}`}>
                        {doc.status || 'Menunggu'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs">
                    {doc.updated_date ? new Date(doc.updated_date).toLocaleDateString('id-ID') : 'Hari ini'}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center justify-center">
                      
                      {/* Container Pil Pembungkus Aksi */}
                      <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-100 shadow-sm transition-all hover:bg-white hover:shadow">
                        
                        <button 
                          onClick={() => handlePreview(doc.document_id)}
                          className="text-gray-500 hover:text-[#126863] hover:bg-teal-50 p-1.5 rounded-lg transition-colors" 
                          title="Lihat Pratinjau"
                        >
                          <Eye size={18} strokeWidth={2.5} />
                        </button>

                        {(doc.status?.toLowerCase() === 'direvisi' || doc.status?.toLowerCase() === 'draft') ? (
                          <button 
                            onClick={() => handleEditClick(doc)}
                            className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors" 
                            title="Edit / Lihat Catatan Revisi"
                          >
                            <Pencil size={18} strokeWidth={2.5} />
                          </button>
                        ) : doc.status?.toLowerCase() === 'disetujui' ? (
                          <button 
                            onClick={() => handleDownload(doc)}
                            disabled={downloadingId === doc.document_id}
                            className={`p-1.5 rounded-lg transition-colors ${
                              downloadingId === doc.document_id 
                                ? 'text-green-600 bg-green-50 opacity-70 cursor-not-allowed' 
                                : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={downloadingId === doc.document_id ? "Sedang Mengunduh..." : "Unduh Dokumen Final"}
                          >
                            {downloadingId === doc.document_id ? (
                              <Loader2 size={18} className="animate-spin" strokeWidth={2.5} />
                            ) : (
                              <Download size={18} strokeWidth={2.5} />
                            )}
                          </button>
                        ) : null}

                        {(doc.status?.toLowerCase() === 'draft' || doc.status?.toLowerCase() === 'menunggu') && (
                          <>
                            <div className="w-[1px] h-4 bg-gray-200 mx-1"></div> {/* Garis pemisah */}
                            <button 
                              onClick={() => handleDelete(doc.document_id)}
                              className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" 
                              title="Hapus Dokumen"
                            >
                              <Trash2 size={18} strokeWidth={2.5} />
                            </button>
                          </>
                        )}

                      </div>
                      
                    </div>
                  </td>
                </tr>
              ))
            )}

          </tbody>
        </table>
        {/* =========================================
                       Modal Preview PDF
        ========================================= */}
        {isPreviewOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
            <div className="bg-white w-full max-w-5xl h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
              
              {/* Header Modal */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-bold text-[#126863]">Pratinjau Dokumen</h3>
                <button onClick={closePreview} className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg p-1.5 transition-colors">
                  <X size={24} strokeWidth={2.5} />
                </button>
              </div>

              {/* Body Modal (Iframe PDF) */}
              <div className="flex-1 bg-gray-200 p-2 md:p-4">
                {isLoadingPreview ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-[#126863]/20 border-t-[#126863] rounded-full animate-spin mb-4"></div>
                    <p className="text-[#126863] font-medium animate-pulse">Menyiapkan PDF...</p>
                  </div>
                ) : pdfUrl ? (
                  <iframe 
                    src={`${pdfUrl}#toolbar=0`} 
                    className="w-full h-full rounded-xl border border-gray-300 shadow-inner" 
                    title="PDF Preview" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium">
                    Gagal memuat dokumen.
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* =========================================
          Modal Catatan Revisi
        ========================================= */}
        {isRevisionModalOpen && selectedRevisionDoc && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-8">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 relative">
              
              <h3 className="text-[22px] font-bold text-[#126863] mb-6">Catatan Revisi Dokumen</h3>
              
              {/* PERBAIKAN: Menggunakan Grid 3 Kolom */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                <div className="grid grid-cols-[110px_15px_1fr] gap-y-3 text-sm text-gray-700">
                  <div className="font-bold">Kategori</div>
                  <div>:</div>
                  <div>{selectedRevisionDoc.category}</div>

                  <div className="font-bold">Judul</div>
                  <div>:</div>
                  <div className="leading-relaxed pr-2">{selectedRevisionDoc.title}</div>

                  <div className="font-bold">No. Dokumen</div>
                  <div>:</div>
                  <div>{selectedRevisionDoc.document_number || '-'}</div>

                  <div className="font-bold">Ditinjau pada</div>
                  <div>:</div>
                  <div>
                    {isLoadingRevision ? '...' : (revisionNotes?.date_create ? new Date(revisionNotes.date_create).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-')}
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-2 font-medium">Pesan dari unit ISO:</p>
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 min-h-[100px]">
                  <Lightbulb size={20} className="text-red-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                  {isLoadingRevision ? (
                    <p className="text-sm text-gray-500 animate-pulse">Memuat catatan...</p>
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {revisionNotes?.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => setIsRevisionModalOpen(false)} 
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <X size={18} strokeWidth={2.5} /> Tutup
                </button>
                <button 
                  onClick={handleProceedToEdit} 
                  disabled={isLoadingRevision}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#126863] rounded-xl hover:bg-[#0d4f4c] shadow-sm transition-colors disabled:opacity-70"
                >
                  <Pencil size={18} strokeWidth={2.5} /> Perbaiki Dokumen
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}