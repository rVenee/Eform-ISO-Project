import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  FileText, GitBranch, ClipboardCheck, FolderClosed, 
  LayoutGrid, Headset, ChevronDown, LogOut 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import logoIK from '../assets/logo_ik.png'; 

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Mengambil informasi role dari local storage
  const userRole = localStorage.getItem('role');
  const isAdmin = userRole === 'admin_iso' || location.pathname.startsWith('/admin');
  const [fullName, setFullName] = useState('');
  
  // State untuk Dropdown Help & Support
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Base path untuk routing dinamis berdasarkan role
  const basePath = userRole === 'admin_it' ? '/it-admin' : isAdmin ? '/admin' : '';

  useEffect(() => {
    const storedName = localStorage.getItem('full_name') || 'User IKPP'; 
    setFullName(storedName);
    
    // Otomatis buka dropdown jika sedang berada di halaman Help
    if (location.pathname.includes('/help')) {
      setIsHelpOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/form-wi' && (location.pathname === '/form-wi' || location.pathname.startsWith('/wi/'))) {
      return "text-[#126863] font-bold border-l-4 border-[#126863] bg-white pl-5";
    }
    if (path === '/others' && location.pathname.startsWith('/others')) {
      return "text-[#126863] font-bold border-l-4 border-[#126863] bg-white pl-5";
    }
    
    return location.pathname === path 
      ? "text-[#126863] font-bold border-l-4 border-[#126863] bg-white pl-5" 
      : "text-gray-500 font-medium pl-6 hover:bg-gray-50 hover:text-gray-800 border-l-4 border-transparent";
  };

  // Pengecekan aktif khusus untuk sub-menu (tanpa border kiri)
  const isActiveSub = (path) => {
    return location.pathname === path
      ? "text-[#126863] font-bold"
      : "text-gray-500 font-medium hover:text-gray-800";
  };

  const isReviewPage = location.pathname.includes('/admin/review');
  const isHelpActive = location.pathname.includes('/help');

  const getPageTitle = () => {
    if (isReviewPage) return 'Review Dokumen';
    if (location.pathname.includes('/help')) return 'Help & Support';
    
    switch(location.pathname) {
      case '/dashboard': return 'Dashboard';
      case '/form-wi': return 'Work Instruction';
      case '/qm': return 'Quality Manual';
      case '/sop': return 'Standard Operating Procedure';
      case '/fm-fr': return 'Forms & Records';
      case '/others': return 'Others';
      case '/admin': return 'Dashboard ISO';
      case '/it-admin': return 'User Management';
      default: return 'E-Form ISO';
    }
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans">
      
      {/* Sidebar Kiri */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        <div className="h-20 flex items-center px-6">
          <img src={logoIK} alt="Indah Kiat" className="h-12 object-contain" />
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          
          {userRole === 'admin_it' ? (
            /* Menu Khusus Admin IT */
            <>
              <div className="px-6 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin IT</div>
              <nav className="space-y-1 mb-8">
                <Link to="/it-admin" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/it-admin')}`}>
                  <LayoutGrid size={18} strokeWidth={2.5} /> Manajemen Pengguna
                </Link>
              </nav>
            </>
          ) : isAdmin ? (
            /* Menu Admin ISO */
            <>
              <div className="px-6 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unit ISO</div>
              <nav className="space-y-1 mb-8">
                <Link to="/admin" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/admin')}`}>
                  <LayoutGrid size={18} strokeWidth={2.5} /> Dashboard ISO
                </Link>
              </nav>
            </>
          ) : (
            /* Menu User Regular */
            <>
              <div className="px-6 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">User</div>
              <nav className="space-y-1 mb-8">
                <Link to="/dashboard" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/dashboard')}`}>
                  <LayoutGrid size={18} strokeWidth={2.5} /> Dashboard
                </Link>
              </nav>

              <div className="px-6 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Document</div>
              <nav className="space-y-1 mb-8">
                <Link to="/qm" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/qm')}`}>
                  <FileText size={18} strokeWidth={2.5} /> QM
                </Link>
                <Link to="/sop" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/sop')}`}>
                  <GitBranch size={18} strokeWidth={2.5} /> SOP
                </Link>
                <Link to="/form-wi" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/form-wi')}`}>
                  <ClipboardCheck size={18} strokeWidth={2.5} /> WI
                </Link>
                <Link to="/fm-fr" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/fm-fr')}`}>
                  <FolderClosed size={18} strokeWidth={2.5} /> FM / FR
                </Link>
                <Link to="/others" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/others')}`}>
                  <FileText size={18} strokeWidth={2.5} /> Others
                </Link>
              </nav>
            </>
          )}

          {/* Menu General (Berlaku untuk semua role) */}
          <div className="px-6 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">General</div>
          <nav className="space-y-1">
            
            {/* Tombol Induk Help & Support (Dropdown) */}
            <button 
              onClick={() => setIsHelpOpen(!isHelpOpen)}
              className={`w-full flex items-center justify-between py-2.5 text-sm transition-colors ${
                isHelpActive 
                  ? 'text-[#126863] font-bold bg-white border-l-4 border-[#126863] pl-5' 
                  : 'text-gray-500 font-medium pl-6 hover:bg-gray-50 hover:text-gray-800 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Headset size={18} strokeWidth={2.5} /> Help & Support
              </div>
              <ChevronDown 
                size={16} 
                strokeWidth={2.5} 
                className={`mr-5 transition-transform duration-200 ${isHelpOpen ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Isi Dropdown 3 Sub-Menu */}
            {isHelpOpen && (
              <div className="bg-gray-50/50 py-1.5 space-y-1 border-y border-gray-100">
                <Link 
                  to={`${basePath}/help/contact`} 
                  className={`block py-2 pl-[52px] pr-4 text-[13px] transition-colors ${isActiveSub(`${basePath}/help/contact`)}`}
                >
                  Contact Support ISO
                </Link>
                <Link 
                  to={`${basePath}/help/guide`} 
                  className={`block py-2 pl-[52px] pr-4 text-[13px] transition-colors ${isActiveSub(`${basePath}/help/guide`)}`}
                >
                  Panduan Penggunaan
                </Link>
                <Link 
                  to={`${basePath}/help/documents`} 
                  className={`block py-2 pl-[52px] pr-4 text-[13px] transition-colors ${isActiveSub(`${basePath}/help/documents`)}`}
                >
                  Dokumen Referensi ISO
                </Link>
              </div>
            )}
            
          </nav>
        </div>

        {/* Profil Bawah */}
        <div className="p-5 border-t border-gray-200">
          <p className="text-sm font-bold text-gray-600 text-center truncate px-2" title={fullName}>
            {fullName}
          </p>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header / Topbar */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h1 className="text-2xl font-black text-[#126863]">{getPageTitle()}</h1>
          
          <div className="flex items-center space-x-6 text-sm text-[#126863] font-bold">
            <span className="cursor-pointer hover:text-teal-900 flex items-center gap-1">
              eOffice User <ChevronDown size={16} strokeWidth={3} />
            </span>
            <span className="cursor-pointer hover:text-teal-900 flex items-center gap-1">
              ISOTeam <ChevronDown size={16} strokeWidth={3} />
            </span>
            
            {/* Tombol Logout */}
            <div className="relative group flex items-center ml-4 border-l border-gray-200 pl-6 h-full">
              <button 
                onClick={handleLogout} 
                disabled={isReviewPage}
                className={`flex items-center gap-1 transition-colors ${
                  isReviewPage 
                    ? 'text-red-300 cursor-not-allowed'
                    : 'text-red-600 hover:text-red-800 cursor-pointer'
                }`}
              >
                <LogOut size={16} strokeWidth={3} /> Logout
              </button>

              {isReviewPage && (
                <div className="absolute top-full right-0 mt-3 hidden group-hover:block w-max bg-white text-gray-600 text-xs font-medium py-2 px-3 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-gray-100 z-50">
                  Selesaikan atau Batalkan Review terlebih dahulu untuk keluar.
                  <div className="absolute -top-1.5 right-6 border-4 border-transparent border-b-white drop-shadow-sm"></div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
          <Outlet />
        </main>
        
      </div>
    </div>
  );
}