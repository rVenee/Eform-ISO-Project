import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ClipboardCheck, GitBranch, ChevronDown, Download, Eye, Plus, Pencil, LayoutGrid, FileText, Folder } from 'lucide-react';
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

  // Auto-fetch dengan Debounce
  useEffect(() => {
    const fetchFilteredDocuments = async () => {
      setIsLoading(true);
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
        setIsLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchFilteredDocuments();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
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
      case 'diproses': 
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
                  <td className="px-5 py-4">{doc.document_number || '-'}</td>
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
                    <div className="flex items-center justify-center gap-4">
                      
                      <button className="text-yellow-600 hover:text-yellow-700 transition-colors p-1" title="Lihat Pratinjau">
                        <Eye size={22} strokeWidth={2.5} />
                      </button>

                      {(doc.status?.toLowerCase() === 'direvisi' || doc.status?.toLowerCase() === 'draft') ? (
                        <Link 
                          to={['NCR', 'DOP', 'JB', 'TM'].includes(doc.category?.toUpperCase()) ? `/others/${doc.document_id}` : `/wi/${doc.document_id}`} 
                          className="text-[#126863] hover:text-[#0d4f4c] transition-colors p-1" 
                          title="Perbarui Dokumen"
                        >
                          <Pencil size={22} strokeWidth={2.5} />
                        </Link>
                      ) : doc.status?.toLowerCase() === 'disetujui' ? (
                        <button className="text-red-500 hover:text-red-700 transition-colors p-1" title="Unduh PDF">
                          <Download size={22} strokeWidth={2.5} />
                        </button>
                      ) : null} 

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