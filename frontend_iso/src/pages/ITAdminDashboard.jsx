import { useState, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, Key, ShieldCheck, User as UserIcon, X, AlertTriangle } from 'lucide-react';
import apiClient from '../api/axios'; 

export default function ITAdminDashboard() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); 
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    section: '',
    role: 'user',
    password: ''
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error("Gagal memuat data pengguna:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (mode, user = null) => {
    setModalMode(mode);
    setSelectedUser(user);
    if (mode === 'add') {
      setFormData({ username: '', full_name: '', section: '', role: 'user', password: '' });
    } else if (mode === 'edit' || mode === 'reset') {
      setFormData({ 
        username: user.username, 
        full_name: user.full_name, 
        section: user.section || '', 
        role: user.role,
        password: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ username: '', full_name: '', section: '', role: 'user', password: '' });
    setSelectedUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        await apiClient.post('/users', formData);
      } else if (modalMode === 'edit') {
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        await apiClient.put(`/users/${selectedUser.user_id}`, payload);
      } else if (modalMode === 'reset') {
        await apiClient.put(`/users/${selectedUser.user_id}/reset-password`, { password: formData.password });
      }
      fetchUsers();
      handleCloseModal();
    } catch (error) {
      alert(error.response?.data?.detail || "Terjadi kesalahan saat menyimpan data.");
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/users/${selectedUser.user_id}`);
      fetchUsers();
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      alert("Gagal menghapus pengguna.");
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || user.username.toLowerCase().includes(searchQuery.toLowerCase()) || (user.section || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <p className="text-gray-500 text-sm max-w-2xl leading-relaxed">
          Kelola akun Unit ISO dan User di sini: tambah pengguna baru, ubah data & peran, reset kata sandi, atau hapus akun. Perubahan berlaku langsung ke tabel <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono text-xs border border-gray-200">users</code>.
        </p>
        <button onClick={() => handleOpenModal('add')} className="flex items-center gap-2 px-5 py-2.5 bg-[#126863] hover:bg-[#0d4f4c] text-white font-bold rounded-xl text-sm shadow-sm transition-colors shrink-0">
          <Plus size={18} strokeWidth={2.5} /> Tambah Pengguna
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center shrink-0">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama, username, atau section..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#126863]/50 focus:border-[#126863] bg-white shadow-sm"
          />
        </div>
        
        <div className="flex bg-white border border-gray-200 p-1 rounded-xl shrink-0 shadow-sm">
          {['all', 'admin_iso', 'user'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-5 py-2 text-sm font-bold rounded-lg transition-colors ${roleFilter === role ? 'bg-[#126863] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {role === 'all' ? 'Semua Role' : role === 'admin_iso' ? 'Unit ISO' : 'User'}
            </button>
          ))}
        </div>
      </div>

      {/* Wadah tabel: border tipis konsisten (border-gray-100), header dibedakan dengan bg-gray-50 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden mb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 text-xs font-black text-gray-500 tracking-wider text-center">NOMOR</th>
                <th className="px-6 py-3.5 text-xs font-black text-gray-500 tracking-wider text-center">NAMA & USERNAME</th>
                <th className="px-6 py-3.5 text-xs font-black text-gray-500 tracking-wider text-center">SECTION</th>
                <th className="px-6 py-3.5 text-xs font-black text-gray-500 tracking-wider text-center">ROLE</th>
                <th className="px-6 py-3.5 text-xs font-black text-gray-500 tracking-wider text-center">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" className="text-center py-10 text-gray-400">Memuat data...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-10 text-gray-400">Tidak ada pengguna ditemukan.</td></tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr
                    key={user.user_id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-sm font-medium text-gray-400 text-center align-middle">{index + 1}</td>
                    <td className="px-6 py-3.5 text-center align-middle">
                      <div className="font-bold text-gray-800">{user.full_name}</div>
                      <div className="text-xs text-gray-500">@{user.username}</div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-600 text-center align-middle">{user.section || '-'}</td>
                    <td className="px-6 py-3.5 align-middle">
                      <div className="flex justify-center">
                        <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold w-28 whitespace-nowrap ${
                          user.role === 'admin_iso' ? 'bg-teal-50 text-[#126863] border border-teal-100' : 
                          user.role === 'admin_it' ? 'bg-gray-800 text-white border border-gray-900' :
                          'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {user.role === 'admin_iso' ? <ShieldCheck size={14} className="shrink-0" /> : <UserIcon size={14} className="shrink-0" />}
                          <span>{user.role === 'admin_iso' ? 'Unit ISO' : user.role === 'admin_it' ? 'Admin IT' : 'User'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 align-middle">
                      <div className="flex justify-center">
                        {/* Grup aksi horizontal: divide-x bawaan Tailwind sebagai pemisah tipis,
                            tanpa elemen div "hantu" yang bisa menutupi tombol & memblokir klik */}
                        <div className="inline-flex items-center divide-x divide-gray-200 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleOpenModal('edit', user)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Data"
                          >
                            <Pencil size={16} strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenModal('reset', user)}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Reset Password"
                          >
                            <Key size={16} strokeWidth={2.5} />
                          </button>
                          {user.role !== 'admin_it' && (
                            <button
                              type="button"
                              onClick={() => { setSelectedUser(user); setIsDeleteModalOpen(true); }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Hapus Akun"
                            >
                              <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 bg-white text-xs text-gray-500 font-medium text-left">
          Menampilkan {filteredUsers.length} dari {users.length} pengguna
        </div>
      </div>

      <div className="bg-[#f0f7f7] border border-[#126863]/30 rounded-xl p-4 flex items-start gap-3 shrink-0">
        <ShieldCheck className="text-[#126863] shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-[#126863] leading-relaxed">
          Saat login, sistem membaca kolom <strong>role</strong> pada tabel <strong>users</strong>: role <strong>Unit ISO</strong> diarahkan ke Dashboard ISO, role <strong>User</strong> diarahkan ke e-Form pembuatan dokumen. Halaman ini menggantikan proses update database secara manual oleh developer.
        </p>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-[#126863]">
                {modalMode === 'add' ? 'Tambah Pengguna Baru' : modalMode === 'edit' ? 'Edit Data Pengguna' : 'Reset Kata Sandi'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {modalMode !== 'reset' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Nama Lengkap</label>
                    <input type="text" required value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126863]/50 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Username</label>
                    <input type="text" required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126863]/50 outline-none" disabled={modalMode === 'edit'} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Section / Departemen</label>
                    <input type="text" value={formData.section} onChange={(e) => setFormData({...formData, section: e.target.value})} placeholder="Contoh: Produksi - PM1" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126863]/50 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Role</label>
                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126863]/50 outline-none bg-white">
                      <option value="user">User Biasa</option>
                      <option value="admin_iso">Unit ISO (Admin)</option>
                    </select>
                  </div>
                </>
              )}

              {(modalMode === 'add' || modalMode === 'reset') && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Kata Sandi Baru</label>
                  <input type="text" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126863]/50 outline-none" placeholder="Minimal 6 karakter" />
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Batal</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-[#126863] hover:bg-[#0d4f4c] rounded-xl transition-colors">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Hapus Pengguna?</h3>
            <p className="text-sm text-gray-500 mb-6">Anda yakin ingin menghapus <strong>{selectedUser?.full_name}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors w-full">Batal</button>
              <button onClick={handleDelete} className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors w-full">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
