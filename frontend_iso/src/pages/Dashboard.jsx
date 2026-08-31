import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ClipboardCheck, GitBranch, ChevronDown, Download, Eye, Plus, Pencil } from 'lucide-react';
import apiClient from '../api/axios';

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await apiClient.get('/documents'); 
        setDocuments(response.data);
      } catch (err) {
        setError('Gagal memuat data riwayat dokumen.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'disetujui': return 'bg-[#d1fae5] text-[#065f46]';
      case 'menunggu': return 'bg-[#fef3c7] text-[#92400e]';
      case 'direvisi': return 'bg-[#fee2e2] text-[#b91c1c]';
      case 'diproses': return 'bg-[#dbeafe] text-[#1e40af]';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      
      {/* Header Teks & Tombol Buat Dokumen */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <p className="text-[#8c949c] text-[15px] leading-relaxed flex-1">
          Daftar dokumen ISO yang pernah Anda buat beserta statusnya. Unduh atau lihat pratinjau langsung dari sini, dan edit jika status direvisi.
        </p>
        <Link 
          to="/wi" 
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
            placeholder="Search by tittle or category" 
            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863] text-gray-700 placeholder-gray-400"
          />
        </div>

        {/* Row 2: Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <div className="relative">
              <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#126863] appearance-none bg-white">
                <option>All Categories</option>
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <div className="relative">
              <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#126863] appearance-none bg-white">
                <option>All Status</option>
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 3: Dates */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">From date</label>
            <input type="date" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#126863] bg-white" />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">To date</label>
            <input type="date" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#126863] bg-white" />
          </div>
          <button className="w-full md:w-40 px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors h-[42px] shrink-0">
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
      <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm overflow-hidden min-h-[300px]">
        <table className="w-full text-sm text-center">
          {/* Teks Header Diperbesar menjadi text-xs */}
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
            
            {isLoading ? (
              <tr>
                <td colSpan="6" className="px-5 py-10 text-gray-400">Memuat data dokumen...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-5 py-10 text-gray-400">Belum ada dokumen yang diajukan.</td>
              </tr>
            ) : (
              documents.map((doc, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-5 py-4 flex items-center justify-center gap-3">
                    {doc.category === 'WI' ? <ClipboardCheck size={18} className="text-[#126863]" /> : <GitBranch size={18} className="text-[#126863]" />}
                    <span className="w-24 text-left">{doc.category || 'Dokumen'}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-900">{doc.title}</td>
                  <td className="px-5 py-4">{doc.document_number || '-'}</td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex justify-center">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold w-24 inline-block text-center shadow-sm ${getStatusStyle(doc.status)}`}>
                        {doc.status || 'Menunggu'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs">{doc.updated_at || doc.created_at || 'Hari ini'}</td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center justify-center gap-4">
                      {/* Logika Kolom Aksi Berdasarkan Status */}
                      {doc.status?.toLowerCase() === 'direvisi' ? (
                        <button 
                          className="text-[#126863] hover:text-[#0d4f4c] transition-colors p-1" 
                          title="Edit Dokumen"
                        >
                          <Pencil size={18} strokeWidth={2.5} />
                        </button>
                      ) : (
                        <>
                          <button 
                            className="text-yellow-600 hover:text-yellow-700 transition-colors p-1" 
                            title="Lihat Pratinjau"
                          >
                            <Eye size={18} strokeWidth={2.5} />
                          </button>
                          <button 
                            className="text-red-500 hover:text-red-700 transition-colors p-1" 
                            title="Unduh PDF"
                          >
                            <Download size={18} strokeWidth={2.5} />
                          </button>
                        </>
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