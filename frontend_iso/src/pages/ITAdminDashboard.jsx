import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, Key, ShieldCheck, User as UserIcon, X, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown, Check } from 'lucide-react';
import { ALL_SECTIONS, SECTION_TO_DIVISION, DIVISIONS } from '../data/sectionDivisionMap';
import apiClient from '../api/axios';
import Pagination from '../components/Pagination';

function SectionCombobox({ value, onChange, disabled }) {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => setQuery(value || ''), [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return ALL_SECTIONS.slice(0, 50);
    const q = query.toLowerCase();
    return ALL_SECTIONS.filter(s => s.toLowerCase().includes(q)).slice(0, 50);
  }, [query]);

  const handleSelect = (section) => {
    setQuery(section);
    onChange(section);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        disabled={disabled}
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(''); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        placeholder="Ketik untuk mencari section..."
        className={`w-full px-4 py-2 border border-gray-200 rounded-xl outline-none ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-[#126863]/50'}`}
      />
      {isOpen && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-400">Tidak ditemukan</div>
          ) : (
            filtered.map((section) => (
              <button
                type="button"
                key={section}
                onClick={() => handleSelect(section)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-teal-50 flex items-center justify-between"
              >
                <span>{section}</span>
                {section === value && <Check size={14} className="text-[#126863]" />}
                <span className="text-xs text-gray-400">{SECTION_TO_DIVISION[section]}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ITAdminDashboard() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); 
  const [selectedUser, setSelectedUser] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [divisionOptions, setDivisionOptions] = useState([]);
  const PAGE_SIZE = 10;

  const SECTION_DRIVEN_ROLES = ['applicator', 'unit_head'];
  const FULL_DIVISION_DROPDOWN_ROLES = ['division_head'];
  const MILL_HEAD_DIVISIONS = ['MHO', 'MHO P'];
  const NO_SECTION_NO_DIVISION_ROLES = ['qmr', 'emr', 'enmr', 'smr', 'kahi', 'mr', 'admin_it'];
  const UNIT_ISO_ROLE = 'admin_iso';
  const HRD_ROLE = 'hrd';

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    section: '',
    division: '',
    role: 'applicator',
    password: ''
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        role: roleFilter,
        division: divisionFilter,
      };
      if (searchQuery) params.search = searchQuery;
      if (sortConfig.key) {
        params.sort_by = sortConfig.key;
        params.sort_dir = sortConfig.direction;
      }

      const response = await apiClient.get('/users', { params });
      setUsers(response.data.items);
      setTotalPages(response.data.total_pages);
      setTotalItems(response.data.total_items);
    } catch (error) {
      console.error("Gagal memuat data pengguna:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (modalMode !== 'add' && modalMode !== 'edit') return;

    if (formData.role === UNIT_ISO_ROLE) {
      if (formData.section !== 'MS' || formData.division !== 'PASR') {
        setFormData(prev => ({ ...prev, section: 'MS', division: 'PASR' }));
      }
    } else if (formData.role === HRD_ROLE) {
    if (formData.section || formData.division !== 'HRD') {
      setFormData(prev => ({ ...prev, section: '', division: 'HRD' }));
      }
    } else if (NO_SECTION_NO_DIVISION_ROLES.includes(formData.role)) {
      if (formData.section || formData.division) {
        setFormData(prev => ({ ...prev, section: '', division: '' }));
      }
    } else if (FULL_DIVISION_DROPDOWN_ROLES.includes(formData.role) || formData.role === 'mill_head') {
      if (formData.section) {
        setFormData(prev => ({ ...prev, section: '' }));
      }
    }
  }, [formData.role]);

  const handleSectionChange = (section) => {
    const autoDivision = SECTION_TO_DIVISION[section] || '';
    setFormData(prev => ({ ...prev, section, division: autoDivision }));
  };

  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const res = await apiClient.get('/users/divisions');
        setDivisionOptions(res.data);
      } catch (error) {
        console.error("Gagal memuat daftar divisi:", error);
      }
    };
    fetchDivisions();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, divisionFilter, sortConfig]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchUsers(), 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, roleFilter, divisionFilter, sortConfig, page]);

  const handleOpenModal = (mode, user = null) => {
    setModalMode(mode);
    setSelectedUser(user);
    if (mode === 'add') {
      setFormData({ username: '', full_name: '', section: '', division: '', role: 'applicator', password: '' });
    } else if (mode === 'edit' || mode === 'reset') {
      setFormData({
        username: user.username,
        full_name: user.full_name,
        section: user.section || '',
        division: user.division || '',
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

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={12} className="text-gray-300" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp size={12} className="text-[#126863]" />
      : <ArrowDown size={12} className="text-[#126863]" />;
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin_iso: 'Unit ISO',
      admin_it: 'Admin IT',
      unit_head: 'Unit Head',
      division_head: 'Div Head',
      qmr: 'QMR',
      emr: 'EMR',
      enmr: 'EnMR',
      smr: 'SMR',
      kahi: 'KAHI',
      mr: 'MR',
      hrd: 'HRD',
      mill_head: 'Mill Head',
      applicator: 'Applicator'
    };
    return labels[role] || role;
  };

  const ROLE_OPTIONS = [
    { value: 'all', label: 'Semua Role' },
    { value: 'applicator', label: 'Applicator' },
    { value: 'unit_head', label: 'Unit Head' },
    { value: 'division_head', label: 'Division Head' },
    { value: 'qmr', label: 'QMR' },
    { value: 'emr', label: 'EMR' },
    { value: 'enmr', label: 'EnMR' },
    { value: 'smr', label: 'SMR' },
    { value: 'kahi', label: 'KAHI' },
    { value: 'mr', label: 'MR' },
    { value: 'hrd', label: 'HRD' },
    { value: 'mill_head', label: 'Mill Head' },
    { value: 'admin_iso', label: 'Unit ISO' },
    { value: 'admin_it', label: 'Admin IT' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <p className="text-gray-500 text-sm max-w-2xl leading-relaxed">
          Kelola akun Unit ISO dan User di sini: tambah pengguna baru, ubah data & peran, reset kata sandi, atau hapus akun. Perubahan berlaku langsung ke tabel <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono text-xs border border-gray-200">users</code>.
        </p>
        <button onClick={() => handleOpenModal('add')} className="flex items-center gap-2 px-5 py-2.5 bg-[#126863] hover:bg-[#0d4f4c] text-white font-bold rounded-xl text-sm shadow-sm transition-colors shrink-0">
          <Plus size={18} strokeWidth={2.5} /> Tambah Pengguna
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center shrink-0">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari nama, username, atau section..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#126863]/50 focus:border-[#126863] bg-white shadow-sm"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full md:w-56 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#126863]/50 bg-white shadow-sm cursor-pointer"
        >
          {ROLE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
          className="w-full md:w-56 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#126863]/50 bg-white shadow-sm cursor-pointer"
        >
          <option value="all">Semua Divisi</option>
          {divisionOptions.map(div => (
            <option key={div} value={div}>{div}</option>
          ))}
        </select>
      </div>

      {/* Wadah tabel: border tipis konsisten (border-gray-100), header dibedakan dengan bg-gray-50 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 text-xs font-black text-gray-500 tracking-wider text-center">NOMOR</th>
                <th className="px-6 py-3.5 text-xs font-black text-gray-500 tracking-wider text-center">
                  <button onClick={() => handleSort('full_name')} className="flex items-center justify-center gap-1.5 mx-auto hover:text-gray-800">
                    NAMA & USERNAME <SortIcon columnKey="full_name" />
                  </button>
                </th>
                <th className="px-6 py-3.5 text-xs font-black text-gray-500 tracking-wider text-center">
                  <button onClick={() => handleSort('section')} className="flex items-center justify-center gap-1.5 mx-auto hover:text-gray-800">
                    SECTION <SortIcon columnKey="section" />
                  </button>
                </th>
                <th className="px-6 py-3.5 text-xs font-black text-gray-500 tracking-wider text-center">
                  <button onClick={() => handleSort('division')} className="flex items-center justify-center gap-1.5 mx-auto hover:text-gray-800">
                    DIVISI <SortIcon columnKey="division" />
                  </button>
                </th>
                <th className="px-6 py-3.5 text-xs font-black text-gray-500 tracking-wider text-center">
                  <button onClick={() => handleSort('role')} className="flex items-center justify-center gap-1.5 mx-auto hover:text-gray-800">
                    ROLE <SortIcon columnKey="role" />
                  </button>
                </th>
                <th className="px-6 py-3.5 text-xs font-black text-gray-500 tracking-wider text-center">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6" className="text-center py-10 text-gray-400">Memuat data...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-gray-400">Tidak ada pengguna ditemukan.</td></tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.user_id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-3.5 text-sm font-medium text-gray-400 text-center align-middle">
                          {(page - 1) * PAGE_SIZE + index + 1}
                        </td>
                    <td className="px-6 py-3.5 text-center align-middle">
                      <div className="font-bold text-gray-600">{user.full_name}</div>
                      <div className="text-xs text-gray-500">@{user.username}</div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-600 text-center align-middle">{user.section || '-'}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-600 text-center align-middle">{user.division || '-'}</td>
                    <td className="px-6 py-3.5 align-middle">
                      <div className="flex justify-center">
                        <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold w-32 whitespace-nowrap ${
                          user.role === 'admin_iso' ? 'bg-teal-50 text-[#126863] border border-teal-100' :
                          user.role === 'admin_it' ? 'bg-gray-800 text-white border border-gray-900' :
                          (user.role !== 'applicator') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {user.role === 'admin_iso' ? <ShieldCheck size={14} className="shrink-0" /> : <UserIcon size={14} className="shrink-0" />}
                          <span>{getRoleLabel(user.role)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 align-middle">
                      <div className="flex justify-center">
                        <div className="inline-flex items-center divide-x divide-gray-200 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                          <button type="button" onClick={() => handleOpenModal('edit', user)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit Data">
                            <Pencil size={16} strokeWidth={2.5} />
                          </button>
                          <button type="button" onClick={() => handleOpenModal('reset', user)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Reset Password">
                            <Key size={16} strokeWidth={2.5} />
                          </button>
                          {user.role !== 'admin_it' && (
                            <button type="button" onClick={() => { setSelectedUser(user); setIsDeleteModalOpen(true); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Hapus Akun">
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
          Menampilkan {users.length} dari {totalItems} pengguna
        </div>
      </div>
          
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <div className="bg-[#f0f7f7] border border-[#126863]/30 rounded-xl p-4 flex items-start gap-3 shrink-0">
        <ShieldCheck className="text-[#126863] shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-[#126863] leading-relaxed">
          Saat login, sistem membaca kolom <strong>role</strong> pada tabel <strong>users</strong> untuk menentukan alur persetujuan dokumen: <strong>Applicator</strong> mengajukan dokumen baru; <strong>Unit Head</strong>, <strong>Division Head</strong>, <strong>QMR/EMR/EnMR/SMR/KAHI</strong>, <strong>MR</strong>, <strong>HRD</strong>, dan <strong>Mill Head</strong> meninjau dokumen sesuai jenjang dan divisinya masing-masing; <strong>Unit ISO</strong> menangani administrasi dan penomoran dokumen; dan <strong>Admin IT</strong> mengelola seluruh akun pengguna di halaman ini. Perubahan role, section, atau divisi berlaku langsung ke seluruh alur persetujuan terkait pengguna tersebut.
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
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Role / Jabatan</label>
                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126863]/50 outline-none bg-white">
                      <option value="applicator">Applicator (Pengaju)</option>
                      <option value="unit_head">Unit Head</option>
                      <option value="division_head">Division Head</option>
                      <option value="qmr">QMR</option>
                      <option value="emr">EMR</option>
                      <option value="enmr">EnMR</option>
                      <option value="smr">SMR</option>
                      <option value="kahi">KAHI</option>
                      <option value="mr">Management Representative (MR)</option>
                      <option value="hrd">HRD</option>
                      <option value="mill_head">Mill Head</option>
                      <option value="admin_iso">Unit ISO (Admin)</option>
                      <option value="admin_it">Admin IT (Super Admin)</option>
                    </select>
                  </div>

                  {SECTION_DRIVEN_ROLES.includes(formData.role) && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">Section</label>
                      <SectionCombobox value={formData.section} onChange={handleSectionChange} disabled={false} />
                    </div>
                  )}

                  {!NO_SECTION_NO_DIVISION_ROLES.includes(formData.role) && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">Divisi</label>

                      {formData.role === 'mill_head' ? (
                        <select
                          value={formData.division}
                          onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126863]/50 outline-none bg-white"
                        >
                          <option value="">-- Pilih Divisi Mill Head --</option>
                          {MILL_HEAD_DIVISIONS.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>

                      ) : FULL_DIVISION_DROPDOWN_ROLES.includes(formData.role) ? (
                        <select
                          value={formData.division}
                          onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126863]/50 outline-none bg-white"
                        >
                          <option value="">-- Pilih Divisi --</option>
                          {DIVISIONS.map(d => (
                            <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
                          ))}
                        </select>

                      ) : (
                        <input
                          type="text"
                          value={formData.division}
                          disabled={formData.role === UNIT_ISO_ROLE || formData.role === HRD_ROLE || SECTION_DRIVEN_ROLES.includes(formData.role)}
                          onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                          placeholder={SECTION_DRIVEN_ROLES.includes(formData.role) ? 'Otomatis dari Section' : ''}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126863]/50 outline-none bg-gray-100"
                        />
                      )}
                    </div>
                  )}
                </>
              )}

              {(modalMode === 'add' || modalMode === 'reset') && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Kata Sandi Baru</label>
                  <input 
                    type="password" 
                    required 
                    minLength={6}
                    value={formData.password} 
                    onChange={(e) => setFormData({...formData, password: e.target.value})} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126863]/50 outline-none text-sm" 
                    placeholder="Minimal 6 karakter" 
                  />
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
