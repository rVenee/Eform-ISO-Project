import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  FileText, GitBranch, ClipboardCheck, FolderClosed, 
  LayoutGrid, History, Headset, ChevronDown, LogOut 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import logoIK from '../assets/logo_ik.png'; 

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Mengambil informasi role dari local storage
  const userRole = localStorage.getItem('role');
  const isAdmin = userRole === 'admin' || location.pathname.startsWith('/admin');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const storedName = localStorage.getItem('full_name') || 'User IKPP'; 
    setFullName(storedName);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path 
    ? "text-[#126863] font-bold border-l-4 border-[#126863] bg-white pl-5" 
    : "text-gray-500 font-medium pl-6 hover:bg-gray-50 hover:text-gray-800 border-l-4 border-transparent";

  const getPageTitle = () => {
    switch(location.pathname) {
      case '/dashboard': return 'Riwayat Saya';
      case '/form-wi': return 'Work Instruction';
      case '/others': return 'Others';
      case '/admin': return 'Dashboard ISO';
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
          
          {isAdmin ? (
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
              <div className="px-6 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Document</div>
              <nav className="space-y-1 mb-8">
                <Link to="/qm" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/qm')}`}>
                  <FileText size={18} strokeWidth={2.5} /> QM
                </Link>
                <Link to="/sop" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/sop')}`}>
                  <GitBranch size={18} strokeWidth={2.5} /> SOP
                </Link>
                <Link to="/form-wi" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/wi')}`}>
                  <ClipboardCheck size={18} strokeWidth={2.5} /> WI
                </Link>
                <Link to="/fm-fr" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/fm-fr')}`}>
                  <FolderClosed size={18} strokeWidth={2.5} /> FM / FR
                </Link>
                <Link to="/others" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/others')}`}>
                  <LayoutGrid size={18} strokeWidth={2.5} /> Others
                </Link>
              </nav>
            </>
          )}

          {/* Menu General */}
          <div className="px-6 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">General</div>
          <nav className="space-y-1">
            {!isAdmin && (
              <Link to="/dashboard" className={`flex items-center gap-3 py-2.5 text-sm ${isActive('/dashboard')}`}>
                <History size={18} strokeWidth={2.5} /> Riwayat Saya
              </Link>
            )}
            <Link to={isAdmin ? "/admin/help" : "/help"} className={`flex items-center gap-3 py-2.5 text-sm ${isActive(isAdmin ? '/admin/help' : '/help')}`}>
              <Headset size={18} strokeWidth={2.5} /> Help & Support
            </Link>
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
            <span className="cursor-pointer hover:text-teal-900 flex items-center gap-1">
              Help <ChevronDown size={16} strokeWidth={3} />
            </span>
            <button onClick={handleLogout} className="cursor-pointer text-red-600 hover:text-red-800 flex items-center gap-1 ml-4 border-l border-gray-200 pl-6">
              <LogOut size={16} strokeWidth={3} /> Logout
            </button>
          </div>
        </header>

        {/* Render Komponen Halaman di Sini */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
          <Outlet />
        </main>
        
      </div>
    </div>
  );
}