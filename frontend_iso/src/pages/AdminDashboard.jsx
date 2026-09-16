import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ClipboardCheck, GitBranch, ChevronDown, Download, FileText, Folder, LayoutGrid, Loader2 } from 'lucide-react';
import apiClient from '../api/axios';
import Pagination from '../components/Pagination';
import DocumentFilters from '../components/DocumentFilters';

export default function AdminDashboard() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const navigate = useNavigate();

  // State untuk melacak ID dokumen yang sedang diunduh
  const [downloadingId, setDownloadingId] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  // Fungsi Fetch Data yang bisa dipanggil kapan saja
  const fetchFilteredDocuments = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (searchQuery) params.search = searchQuery;
      if (category) params.category = category;
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await apiClient.get('/documents', { params }); 
      setDocuments(response.data.items);
      setTotalPages(response.data.total_pages);
    } catch (err) {
      setError('Gagal memuat antrean dokumen.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [searchQuery, category, statusFilter, startDate, endDate, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, category, statusFilter, startDate, endDate]);

  // Efek 1: Fetch saat filter berubah (dengan Debounce)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchFilteredDocuments(true), 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchFilteredDocuments]);

  // Efek 2: AUTO-REFRESH (Polling) setiap 5 detik tanpa loading screen
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFilteredDocuments(false); 
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchFilteredDocuments]);

  const handleLockAndReview = async (docId) => {
    try {
      await apiClient.put(`/documents/${docId}/lock`);
      navigate(`/admin/review/${docId}`);
    } catch (error) {
      alert(error.response?.data?.detail || "Gagal! Dokumen ini baru saja diambil oleh admin lain.");
      fetchFilteredDocuments(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery(''); setCategory(''); setStatusFilter(''); setStartDate(''); setEndDate(''); setPage(1);
  };

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

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Disetujui':
        return 'bg-[#d1fae5] text-[#065f46]';
      case 'Direvisi':
        return 'bg-[#fee2e2] text-[#b91c1c]';
      case 'Direview':
        return 'bg-[#dbeafe] text-[#1e40af]';
      case 'Draft':
        return 'bg-gray-100 text-gray-600';
      case 'Menunggu Unit Head':
      case 'Menunggu Division Head':
      case 'Menunggu ISO':
      case 'Menunggu QMR':
      case 'Menunggu EMR':
      case 'Menunggu EnMR':
      case 'Menunggu SMR':
      case 'Menunggu KAHI':
      case 'Menunggu MR':
      case 'Menunggu HRD':
      case 'Menunggu Mill Head':
        return 'bg-[#fef3c7] text-[#92400e]';
      default:
        return 'bg-gray-100 text-gray-500';
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

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timePart = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '.');
    return (
      <div className="flex flex-col items-center leading-tight"><span>{datePart},</span><span>{timePart}</span></div>
    );
  };

  const currentUserId = parseInt(localStorage.getItem('user_id'), 10);

  const canUnlockOwnDocument = (doc) => {
    return doc.status === 'Direview' && doc.locked_by === currentUserId;
  };

  const handleUnlockOwn = async (docId) => {
    try {
      await apiClient.put(`/documents/${docId}/unlock`);
      fetchFilteredDocuments(false);
    } catch (error) {
      alert(error.response?.data?.detail || "Gagal membuka kunci dokumen.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-gray-500 text-sm max-w-4xl leading-relaxed">
          Semua dokumen ISO yang dikirim oleh user. Antrean ini diperbarui secara otomatis secara real-time.
        </p>
      </div>

      <DocumentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by title or category"
        category={category}
        onCategoryChange={setCategory}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onReset={handleResetFilters}
      />

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 mb-4">{error}</div>}

      <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm overflow-x-auto min-h-[300px] relative">
        {isLoading && <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#126863]/20 border-t-[#126863] rounded-full animate-spin"></div></div>}

        <table className="w-full text-sm text-center min-w-[900px]">
          <thead className="bg-[#f4f6f8] text-[#8c949c] text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-5 py-4 rounded-tl-[20px]">Kategori</th>
              <th className="px-5 py-4">Judul</th>
              <th className="px-5 py-4">Pengaju / Seksi</th>
              <th className="px-5 py-4">No. Dokumen</th>
              <th className="px-5 py-4 text-center">Status</th>
              <th className="px-5 py-4">Dikirim</th>
              <th className="px-5 py-4 text-center rounded-tr-[20px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
            {documents.length === 0 && !isLoading ? (
              <tr><td colSpan="7" className="px-5 py-10 text-gray-400">Belum ada dokumen dalam antrean.</td></tr>
            ) : (
              documents.map((doc, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-5 py-4 align-middle"><div className="flex items-center justify-center gap-3">{getCategoryIcon(doc.category)}<span className="w-24 text-left">{doc.category || 'Dokumen'}</span></div></td>
                  <td className="px-5 py-4 text-gray-900 align-middle"><div className="max-w-[180px] lg:max-w-[250px] mx-auto whitespace-normal break-words text-center">{doc.title}</div></td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex flex-col items-center justify-center max-w-[150px] mx-auto whitespace-normal break-words text-center">
                      <span className="text-gray-900 font-bold">{doc.author_name || '-'}</span>
                      <span className="text-xs text-gray-500 mt-1">{doc.creator_section || 'Umum'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle"><div className="max-w-[150px] mx-auto whitespace-normal break-words text-center">{doc.document_number || '-'}</div></td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex justify-center relative group">
                      <span 
                        className={`px-4 py-1.5 rounded-full text-xs font-bold w-24 inline-block text-center shadow-sm cursor-default ${getStatusStyle(doc.status)}`}
                      >
                        {doc.status || 'Menunggu'}
                      </span>

                      {doc.status === 'Direview' && (
                        <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-white text-gray-600 text-xs font-medium py-2 px-3 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.12)] border border-gray-100 z-20 transition-all">
                          Sedang direview oleh <span className="font-bold text-[#126863]">{doc.locked_by_name || 'Admin lain'}</span>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white drop-shadow-sm"></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs align-middle">{formatDateTime(doc.created_date)}</td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex justify-center">
                      {doc.status === 'Menunggu ISO' || doc.status === 'Direview' ? (
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => handleLockAndReview(doc.document_id)}
                            disabled={doc.status === 'Direview'}
                            className={`px-5 py-2 rounded-lg font-bold text-xs shadow-sm transition-colors w-24 ${
                              doc.status === 'Direview'
                                ? 'bg-gray-400 cursor-not-allowed text-white'
                                : 'bg-[#126863] hover:bg-[#0d4f4c] text-white'
                            }`}
                          >
                            Review
                          </button>
                          {canUnlockOwnDocument(doc) && (
                            <button
                              onClick={() => handleUnlockOwn(doc.document_id)}
                              className="text-[10px] text-amber-600 hover:text-amber-800 underline font-medium"
                            >
                              Buka Kunci Dokumen Ini
                            </button>
                          )}
                        </div>
                      ) : doc.status === 'Disetujui' ? (
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingId === doc.document_id}
                          className={`flex items-center justify-center gap-2 px-3 py-2 border border-[#126863] text-[#126863] rounded-lg font-bold text-xs transition-colors w-24 ${
                            downloadingId === doc.document_id ? 'opacity-70 cursor-not-allowed bg-teal-50' : 'hover:bg-teal-50'
                          }`}
                          title="Unduh Dokumen Final"
                        >
                          {downloadingId === doc.document_id ? (
                            <Loader2 size={14} className="animate-spin" strokeWidth={3} />
                          ) : (
                            <Download size={14} strokeWidth={3} />
                          )}
                          {downloadingId === doc.document_id ? 'Proses...' : 'Unduh'}
                        </button>
                      ) : (
                        <div className="w-24 text-gray-400 text-xs italic">Tahap Lain</div>
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

    </div>
  );
}