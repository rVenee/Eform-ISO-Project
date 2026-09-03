import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ITAdminDashboard from './pages/ITAdminDashboard';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import FormWI from './pages/FormWI';
import FormOthers from './pages/FormOthers';
import AdminDashboard from './pages/AdminDashboard';
import ReviewDokumen from './pages/ReviewDokumen';
import FormQM from './pages/FormQM';
import FormSOP from './pages/FormSOP';
import FormFM from './pages/FormFM';

// Cek apakah user sudah login
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" replace />;
  return children;
};

// Cek apakah user adalah Admin ISO
const AdminRoute = ({ children }) => {
  const role = localStorage.getItem('role');
  if (role !== 'admin_iso') return <Navigate to="/dashboard" replace />;
  return children;
};

// Cek apakah user adalah Admin IT
const ITAdminRoute = ({ children }) => {
  const role = localStorage.getItem('role');
  if (role !== 'admin_it') return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          {/* Rute User Biasa */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/form-wi" element={<FormWI />} />
          <Route path="/qm" element={<FormQM />} />
          <Route path="/sop" element={<FormSOP />} />
          <Route path="/fm-fr" element={<FormFM />} />
          <Route path="/wi/:id" element={<FormWI />} />
          <Route path="/others" element={<FormOthers />} />
          <Route path="/others/:id" element={<FormOthers />} />
          
          {/* Rute Khusus Admin (Dilindungi AdminRoute) */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/admin/review/:id" element={
            <AdminRoute>
              <ReviewDokumen />
            </AdminRoute>} />

          {/* Rute Khusus Admin IT (Dilindungi ITAdminRoute) */}
          <Route path="/it-admin" element={
            <ITAdminRoute>
              <ITAdminDashboard />
            </ITAdminRoute>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;