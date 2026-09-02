import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import logoISO from '../assets/logo_iso.png'; 
import logoIK from '../assets/logo_ik.png';  

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Ubah format data menjadi Form URL-Encoded sesuai standar FastAPI
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await apiClient.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('role', response.data.user_info.role);
      localStorage.setItem('full_name', response.data.user_info.full_name);
      
      if (response.data.user_info.role === 'admin_iso') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Username atau password tidak valid.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex overflow-hidden border border-gray-200 min-h-[450px]">
        
        {/* Sisi Kiri: Banner Gambar Rounded */}
        <div className="hidden md:flex items-center justify-center w-1/2 p-4">
          <img 
            src={logoISO} 
            alt="Logo ISO" 
            className="w-11/12 object-cover rounded-2xl" 
          />
        </div>

        {/* Sisi Kanan: Form Login */}
        <div className="w-full md:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
          
          {/* Header Logo Indah Kiat */}
          <div className="mb-8">
            <img 
              src={logoIK} 
              alt="Indah Kiat Logo" 
              className="h-12 object-contain" 
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.insertAdjacentHTML('afterend', '<div class="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-bold italic text-lg shadow-inner">IK</div>');
              }}
            />
          </div>

          {/* Menampilkan Pesan Error dari API */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#116864] focus:border-transparent text-gray-700 bg-white"
                placeholder="Masukkan username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#116864] focus:border-transparent text-gray-700 bg-white"
                placeholder="Masukkan password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#126863] hover:bg-[#0d4f4c] text-white font-bold py-3.5 rounded-lg transition-colors duration-200 shadow-md mt-4 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {isLoading ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}