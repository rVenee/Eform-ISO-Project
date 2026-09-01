import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Menyisipkan Token ke setiap Request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Menangkap Error 401 dari Backend
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Pastikan error 401 BUKAN berasal dari proses login
      const isLoginRequest = error.config.url.includes('/auth/login');
      
      if (!isLoginRequest) {
        alert('Sesi Anda telah berakhir demi keamanan. Silakan login kembali.');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/'; // Auto-logout
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;