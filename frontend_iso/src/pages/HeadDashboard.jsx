import { useState, useEffect, useCallback } from 'react';
import { Search, ClipboardCheck, X, FileText, GitBranch, Folder, LayoutGrid, CheckCircle } from 'lucide-react';
import apiClient from '../api/axios';

export default function HeadDashboard({ mode }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const userRole = localStorage.getItem('role');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [documentToReject, setDocumentToReject] = useState(null);

  const getTargetStatus = (role) => {
    switch(role) {
      case 'unit_head': return 'Menunggu Unit Head';
      case 'division_head': return 'Menunggu Division Head';
      case 'qmr_emr': return 'Menunggu QMR';
      case 'mr': return 'Menunggu MR';
      case 'hrd': return 'Menunggu HRD';
      case 'mill_head': return 'Menunggu Mill Head';
      default: return '';
    }
  };

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/documents');
      let data = response.data;
      
      // Filter lokal berdasarkan tab yang diklik di sidebar
      if (mode === 'pending') {
        const targetStatus = getTargetStatus(userRole);
        data = data.filter(doc => doc.status === targetStatus);
      }
      
      if (searchQuery) {
        data = data.filter(doc => 
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (doc.document_number && doc.document_number.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      
      setDocuments(data);
    } catch (error) {
      console.error('Gagal memuat dokumen', error);
    } finally {
      setIsLoading(false);
    }
  }, [mode, searchQuery, userRole]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleApprove = async (docId) => {
    const confirmApprove = window.confirm("Apakah Anda yakin ingin MENYETUJUI dokumen ini?");
    if (!confirmApprove) return;
    try {
      await apiClient.put(`/documents/${docId}/approve`);
      fetchDocuments();
    } catch (error) {
      alert(error.response?.data?.detail || "Gagal menyetujui dokumen.");
    }
  };

  const submitReject = async () => {
    if (!rejectNotes.trim()) return alert("Catatan penolakan wajib diisi!");
    try {
      await apiClient.put(`/documents/${documentToReject}/reject`, {
        status: 'Direvisi',
        notes: rejectNotes
      });
      setIsRejectModalOpen(false);
      setRejectNotes('');
      fetchDocuments();
    } catch (error) {
      alert("Gagal menolak dokumen.");
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

  const isPendingAction = (status) => status === getTargetStatus(userRole);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-black text-gray-800 mb-1">
          {mode === 'pending' ? 'Dokumen Perlu Persetujuan' : 'Semua Dokumen'}
        </h2>
        <p className="text-gray-500 text-sm">
          {mode === 'pending' 
            ? 'Daftar dokumen yang menunggu tinjauan dan persetujuan Anda.' 
            : 'Seluruh riwayat dan antrean dokumen yang berada di bawah wewenang Anda.'}
        </p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mb-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-gray-400"><Search size={18} /></span>
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="Cari berdasarkan judul atau nomor dokumen..." 
            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" 
          />
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm overflow-x-auto min-h-[300px] relative">
        {isLoading && <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#126863]/20 border-t-[#126863] rounded-full animate-spin"></div></div>}

        <table className="w-full text-sm text-center min-w-[900px]">
          <thead className="bg-[#f4f6f8] text-[#8c949c] text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-5 py-4 rounded-tl-[20px]">Kategori</th>
              <th className="px-5 py-4">Judul Dokumen</th>
              <th className="px-5 py-4">Pengaju / Seksi</th>
              <th className="px-5 py-4 text-center">Status Saat Ini</th>
              <th className="px-5 py-4 text-center rounded-tr-[20px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
            {documents.length === 0 && !isLoading ? (
              <tr><td colSpan="5" className="px-5 py-10 text-gray-400">Tidak ada dokumen yang ditemukan.</td></tr>
            ) : (
              documents.map((doc, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-5 py-4 align-middle"><div className="flex items-center justify-center gap-3">{getCategoryIcon(doc.category)}<span>{doc.category}</span></div></td>
                  <td className="px-5 py-4 text-gray-900 align-middle"><div className="max-w-[250px] mx-auto break-words">{doc.title}</div></td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex flex-col items-center">
                      <span className="text-gray-900 font-bold">{doc.author_name || '-'}</span>
                      <span className="text-xs text-gray-500">{doc.creator_section || 'Umum'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold w-max inline-block text-center shadow-sm ${
                      isPendingAction(doc.status) ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex justify-center items-center gap-2">
                      {isPendingAction(doc.status) ? (
                        <>
                          <button onClick={() => handleApprove(doc.document_id)} className="flex items-center gap-1.5 px-4 py-2 bg-[#d1fae5] text-[#065f46] hover:bg-[#a7f3d0] rounded-lg font-bold text-xs transition-colors">
                            <CheckCircle size={16} /> Setujui
                          </button>
                          <button onClick={() => { setDocumentToReject(doc.document_id); setIsRejectModalOpen(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-[#fee2e2] text-[#b91c1c] hover:bg-[#fca5a5] rounded-lg font-bold text-xs transition-colors">
                            <X size={16} /> Tolak
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Tidak ada aksi</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-xl font-black text-gray-800 mb-2">Tolak Dokumen</h3>
            <p className="text-sm text-gray-500 mb-4">Berikan alasan mengapa dokumen ini dikembalikan ke pengaju.</p>
            <textarea 
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Tulis catatan revisi di sini..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[120px] mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsRejectModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Batal</button>
              <button onClick={submitReject} className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors">Kembalikan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}