import { useState, useEffect, useCallback } from 'react';
import { Search, ClipboardCheck, X, FileText, GitBranch, Folder, LayoutGrid, ChevronDown, CheckCircle, AlertTriangle, Loader2, Download, Eye } from 'lucide-react';
import apiClient from '../api/axios';
import Pagination from '../components/Pagination';
import DocumentFilters from '../components/DocumentFilters';

export default function HeadDashboard({ mode }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const userRole = localStorage.getItem('role');
  
  // State untuk Modal Review Dokumen
  const [reviewDoc, setReviewDoc] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const getTargetStatuses = useCallback((role) => {
    if (['qmr', 'emr', 'enmr', 'smr', 'kahi', 'mr'].includes(role)) {
      return [`Menunggu ${role.toUpperCase()}`];
    }
    switch(role) {
      case 'unit_head': return ['Menunggu Unit Head'];
      case 'division_head': return ['Menunggu Division Head'];
      case 'hrd': return ['Menunggu HRD', 'Menunggu Division Head']; // HRD memiliki 2 target status
      case 'mill_head': return ['Menunggu Mill Head'];
      default: return [];
    }
  }, []);

  const fetchDocuments = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE, mode };
      if (searchQuery) params.search = searchQuery;
      if (category) params.category = category;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      // Jika mode bukan pending dan ada filter status manual, kirim ke API
      if (mode !== 'pending' && statusFilter) {
        params.status = statusFilter;
      }

      const response = await apiClient.get('/documents', { params });
      
      setDocuments(response.data.items);
      setTotalPages(response.data.total_pages);

    } catch (error) {
      console.error('Gagal memuat dokumen', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [mode, searchQuery, category, statusFilter, startDate, endDate, userRole, getTargetStatuses]);

  useEffect(() => {
    setPage(1);
  }, [mode, searchQuery, category, statusFilter, startDate, endDate]);
  
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchDocuments(true), 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchDocuments]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchDocuments(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  const handleResetFilters = () => {
    setSearchQuery(''); setCategory(''); setStatusFilter(''); setStartDate(''); setEndDate(''); setPage(1);
  };

  const [downloadingId, setDownloadingId] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  const handleDownload = async (doc) => {
    setDownloadingId(doc.document_id);
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
      setDownloadingId(null);
    }
  };

  // --- LOGIKA MODAL REVIEW & PDF ---
  const handleOpenReview = async (doc) => {
    setReviewDoc(doc);
    setShowRejectInput(false);
    setRejectNotes('');
    setIsPdfLoading(true);
    setPdfPreviewUrl('');
    
    try {
      const res = await apiClient.get(`/documents/${doc.document_id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      setPdfPreviewUrl(url);
    } catch (error) {
      alert("Gagal memuat pratinjau dokumen PDF.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleCloseReview = () => {
    if (pdfPreviewUrl) window.URL.revokeObjectURL(pdfPreviewUrl);
    setReviewDoc(null);
    setPdfPreviewUrl('');
    setShowRejectInput(false);
    setShowApproveConfirm(false); // Reset konfirmasi persetujuan
  };

  // Eksekusi API saat tombol "Ya, Setujui" di modal diklik
  const executeApprove = async () => {
    try {
      await apiClient.put(`/documents/${reviewDoc.document_id}/approve`);
      fetchDocuments(false);
      handleCloseReview();
    } catch (error) {
      alert(error.response?.data?.detail || "Gagal menyetujui dokumen.");
    }
  };

  const submitReject = async () => {
    if (!rejectNotes.trim()) return alert("Catatan revisi wajib diisi agar pengaju mengetahui letak kesalahannya.");
    try {
      await apiClient.put(`/documents/${reviewDoc.document_id}/reject`, {
        status: 'Direvisi',
        notes: rejectNotes
      });
      fetchDocuments(false);
      handleCloseReview();
    } catch (error) {
      alert("Gagal mengembalikan dokumen.");
    }
  };

  // --- HELPER TAMPILAN ---
  const isPendingAction = (status) => getTargetStatuses(userRole).includes(status);

  const getStatusStyle = (status) => {
    if (isPendingAction(status)) return 'bg-[#fef3c7] text-[#92400e]';
    switch (status?.toLowerCase()) {
      case 'disetujui': return 'bg-[#d1fae5] text-[#065f46]';
      case 'direvisi': return 'bg-[#fee2e2] text-[#b91c1c]';
      case 'direview': return 'bg-[#dbeafe] text-[#1e40af]';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat?.toUpperCase()) {
      case 'WI': return <ClipboardCheck size={18} className="text-[#126863]" />;
      case 'SOP': return <GitBranch size={18} className="text-[#126863]" />;
      case 'QM': return <FileText size={18} className="text-[#126863]" />;
      case 'FM_FR': return <Folder size={18} className="text-[#126863]" />;
      default: return <LayoutGrid size={18} className="text-[#126863]" />; 
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-gray-500 text-sm">
          {mode === 'pending' 
            ? 'Daftar dokumen yang menunggu tinjauan dan persetujuan Anda.' 
            : 'Riwayat dokumen di bawah wewenang Anda yang sudah disetujui, direvisi, atau sedang diproses oleh pihak lain.'}
        </p>
      </div>

      <DocumentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        category={category}
        onCategoryChange={setCategory}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        statusDisabled={mode === 'pending'}
        lockedStatusLabel={getTargetStatuses(userRole).join(' / ')}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onReset={handleResetFilters}
      />

      {/* TABLE SECTION */}
      <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm overflow-x-auto min-h-[300px] relative">
        {isLoading && <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#126863]/20 border-t-[#126863] rounded-full animate-spin"></div></div>}

        <table className="w-full text-sm text-center min-w-[1000px]">
          <thead className="bg-[#f4f6f8] text-[#8c949c] text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-5 py-4 rounded-tl-[20px]">Kategori</th>
              <th className="px-5 py-4">Initiator / Author</th>
              <th className="px-5 py-4">Seksi</th>
              <th className="px-5 py-4">Judul</th>
              <th className="px-5 py-4">No. Dokumen</th>
              <th className="px-5 py-4 text-center">Status</th>
              <th className="px-5 py-4">Diperbarui</th>
              <th className="px-5 py-4 text-center rounded-tr-[20px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
            {documents.length === 0 && !isLoading ? (
              <tr><td colSpan="8" className="px-5 py-10 text-gray-400">Tidak ada dokumen yang ditemukan.</td></tr>
            ) : (
              documents.map((doc, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center justify-center gap-3">{getCategoryIcon(doc.category)}<span>{doc.category || 'Dokumen'}</span></div>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-sm font-bold text-gray-700" title="Initiator (Disiapkan Oleh)">
                        {doc.creator_name || '-'}
                      </span>
                      <span className="text-xs text-gray-500 mt-0.5" title="Author (Pengaju)">
                        Diajukan oleh: {doc.author_name || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle text-gray-600">{doc.creator_section || 'Umum'}</td>
                  <td className="px-5 py-4 text-gray-900 align-middle">
                    <div className="max-w-[200px] mx-auto whitespace-normal break-words">{doc.title}</div>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <div className="max-w-[150px] mx-auto whitespace-normal break-words">{doc.document_number || '-'}</div>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex justify-center">
                      <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold w-max inline-block text-center shadow-sm ${getStatusStyle(doc.status)}`}>
                        {doc.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs align-middle">
                    {formatDate(doc.updated_date || doc.created_date)}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex justify-center items-center gap-2">
                      {isPendingAction(doc.status) ? (
                        <button 
                          onClick={() => handleOpenReview(doc)}
                          className="px-5 py-2 bg-[#126863] hover:bg-[#0d4f4c] text-white rounded-lg font-bold text-xs transition-colors shadow-sm w-24"
                        >
                          Periksa
                        </button>
                      ) : doc.status?.toLowerCase() === 'direvisi' ? (
                        <span className="text-gray-400 font-bold text-xs italic bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                          Menunggu Direvisi
                        </span>
                      ) : doc.status?.toLowerCase() === 'disetujui' ? (
                        <>
                          <button 
                            onClick={() => handleOpenReview(doc)}
                            className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5"
                            title="Pratinjau Dokumen"
                          >
                            <Eye size={14} /> Preview
                          </button>
                          <button 
                            onClick={() => handleDownload(doc)}
                            disabled={downloadingId === doc.document_id}
                            className="px-3 py-2 bg-[#d1fae5] hover:bg-[#a7f3d0] text-[#065f46] rounded-lg font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                            title="Unduh PDF"
                          >
                            {downloadingId === doc.document_id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleOpenReview(doc)}
                          className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold text-xs transition-colors shadow-sm w-24"
                        >
                          Lihat
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* MODAL REVIEW & PDF PREVIEW */}
      {reviewDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h3 className="text-lg font-black text-teal-800 tracking-wide">
                  Tinjauan Dokumen: {reviewDoc.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  {reviewDoc.category} | Diajukan oleh: {reviewDoc.author_name} ({reviewDoc.creator_section})
                </p>
              </div>
              <button 
                onClick={handleCloseReview} 
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Body (PDF Viewer) */}
            <div className="flex-1 bg-gray-100 relative p-4 overflow-hidden">
              {isPdfLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80">
                  <Loader2 size={32} className="animate-spin text-[#126863] mb-3" />
                  <p className="text-sm font-bold text-gray-500">Mempersiapkan pratinjau dokumen...</p>
                </div>
              ) : pdfPreviewUrl ? (
                <iframe 
                  src={`${pdfPreviewUrl}#toolbar=0`} 
                  className="w-full h-full rounded-xl border border-gray-300 shadow-inner bg-white"
                  title="PDF Preview"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <p>Pratinjau tidak tersedia.</p>
                </div>
              )}
            </div>

            {/* Modal Footer (Action Panel) */}
            {isPendingAction(reviewDoc.status) && (
              <div className="px-6 py-4 border-t border-gray-200 bg-white shrink-0">
                {showRejectInput ? (
                  <div className="animate-in slide-in-from-bottom-2 duration-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Catatan Revisi <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Jelaskan bagian mana yang perlu diperbaiki oleh pengaju..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px] mb-3 bg-gray-50"
                    />
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setShowRejectInput(false)} 
                        className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={submitReject} 
                        className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <AlertTriangle size={16} /> Kirim Catatan & Tolak
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500 hidden md:block">
                      Pastikan seluruh isi dokumen telah sesuai standar sebelum memverifikasi.
                    </p>
                    <div className="flex gap-3 w-full md:w-auto">
                      <button 
                        onClick={() => setShowRejectInput(true)} 
                        className="flex-1 md:flex-none px-6 py-2.5 border-2 border-red-100 text-red-600 hover:bg-red-50 font-bold text-sm rounded-xl transition-colors"
                      >
                        Kembalikan untuk Revisi
                      </button>
                      <button 
                        onClick={() => setShowApproveConfirm(true)} 
                        className="flex-1 md:flex-none px-6 py-2.5 bg-[#126863] text-white hover:bg-[#0d4f4c] font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={18} /> Verifikasi & Setujui
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Approve */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Konfirmasi Persetujuan</h3>
            <p className="text-sm text-gray-500 mb-6">
              Perhatian: Tindakan ini akan menyetujui dokumen secara digital. Apakah Anda yakin ingin melanjutkan?
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setShowApproveConfirm(false)} 
                className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors w-full"
              >
                Batal
              </button>
              <button 
                onClick={executeApprove} 
                className="px-5 py-2.5 text-sm font-bold text-white bg-[#126863] hover:bg-[#0d4f4c] rounded-xl transition-colors w-full"
              >
                Ya, Setujui
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}