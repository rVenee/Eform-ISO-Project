import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ClipboardCheck, GitBranch, ChevronDown, Download, FileText, Folder, LayoutGrid, Loader2 } from 'lucide-react';
import apiClient from '../api/axios';

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

  // Fungsi Fetch Data yang bisa dipanggil kapan saja
  const fetchFilteredDocuments = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
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
      setError('Gagal memuat antrean dokumen.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
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

  // FUNGSI LOCK & REVIEW YANG AMAN
  const handleLockAndReview = async (docId) => {
    try {
      await apiClient.put(`/documents/${docId}/lock`);
      navigate(`/admin/review/${docId}`);
    } catch (error) {
      alert(error.response?.data?.detail || "Gagal! Dokumen ini baru saja diambil oleh admin lain.");
      fetchFilteredDocuments(false); // Langsung refresh tabel seketika
    }
  };

  const handleResetFilters = () => {
    setSearchQuery(''); setCategory(''); setStatusFilter(''); setStartDate(''); setEndDate('');
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
      setDownloadingId(null);
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'disetujui': return 'bg-[#d1fae5] text-[#065f46]';
      case 'menunggu': return 'bg-[#fef3c7] text-[#92400e]';
      case 'direvisi': return 'bg-[#fee2e2] text-[#b91c1c]';
      case 'diproses': 
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

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timePart = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '.');
    return (
      <div className="flex flex-col items-center leading-tight"><span>{datePart},</span><span>{timePart}</span></div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-gray-500 text-sm max-w-4xl leading-relaxed">
          Semua dokumen ISO yang dikirim oleh user. Antrean ini diperbarui secara otomatis secara real-time.
        </p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 mb-4">
        {/* ... INPUT FILTER TETAP SAMA ... */}
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-gray-400"><Search size={18} strokeWidth={2} /></span>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by title or category" className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863] text-gray-700 placeholder-gray-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <div className="relative">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#126863] appearance-none bg-white cursor-pointer">
                <option value="">All Categories</option>
                <option value="WI">Work Instruction (WI)</option>
                <option value="SOP">Standard Operating Procedure (SOP)</option>
                <option value="QM">Quality Manual (QM)</option>
                <option value="FM_FR">Form / Record (FM_FR)</option>
                <optgroup label="Others"><option value="NCR">NCR</option><option value="DOP">DOP</option><option value="JB">JB</option><option value="TM">TM</option></optgroup>
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <div className="relative">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#126863] appearance-none bg-white cursor-pointer">
                <option value="">All Status</option><option value="Menunggu">Menunggu</option><option value="Direview">Direview</option><option value="Direvisi">Direvisi</option><option value="Disetujui">Disetujui</option>
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full"><label className="block text-sm font-medium text-gray-700 mb-1.5">From date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#126863] bg-white cursor-pointer" /></div>
          <div className="flex-1 w-full"><label className="block text-sm font-medium text-gray-700 mb-1.5">To date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#126863] bg-white cursor-pointer" /></div>
          <button onClick={handleResetFilters} className="w-full md:w-40 px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors h-[42px] shrink-0">Reset filters</button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 mb-4">{error}</div>}

      <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm overflow-x-auto min-h-[300px] relative">
        {isLoading && <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#126863]/20 border-t-[#126863] rounded-full animate-spin"></div></div>}

        <table className="w-full text-sm text-center min-w-[900px]">
          <thead className="bg-[#f4f6f8] text-[#8c949c] text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-5 py-4 rounded-tl-[20px]">Kategori</th>
              <th className="px-5 py-4">Judul</th>
              <th className="px-5 py-4">Pengaju</th>
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
                  <td className="px-5 py-4 text-gray-900 align-middle"><div className="max-w-[150px] mx-auto whitespace-normal break-words text-center">{doc.creator_name || '-'}</div></td>
                  <td className="px-5 py-4 align-middle"><div className="max-w-[150px] mx-auto whitespace-normal break-words text-center">{doc.document_number || '-'}</div></td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex justify-center relative group">
                      <span 
                        className={`px-4 py-1.5 rounded-full text-xs font-bold w-24 inline-block text-center shadow-sm cursor-default ${getStatusStyle(doc.status)}`}
                      >
                        {doc.status || 'Menunggu'}
                      </span>

                      {doc.status?.toLowerCase() === 'direview' && (
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
                      {['menunggu', 'direview', 'diproses'].includes(doc.status?.toLowerCase()) ? (
                        <button onClick={() => handleLockAndReview(doc.document_id)} disabled={doc.status?.toLowerCase() === 'direview'} className={`px-5 py-2 rounded-lg font-bold text-xs shadow-sm transition-colors w-24 ${doc.status?.toLowerCase() === 'direview' ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-[#126863] hover:bg-[#0d4f4c] text-white'}`}>
                          Review
                        </button>
                      ) : doc.status?.toLowerCase() === 'disetujui' ? (
                        <button 
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingId === doc.document_id}
                          className={`flex items-center justify-center gap-2 px-3 py-2 border border-[#126863] text-[#126863] rounded-lg font-bold text-xs transition-colors w-24 ${
                            downloadingId === doc.document_id 
                              ? 'opacity-70 cursor-not-allowed bg-teal-50' 
                              : 'hover:bg-teal-50'
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
                        <div className="w-24 text-gray-400 text-xs italic">Menunggu User</div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}