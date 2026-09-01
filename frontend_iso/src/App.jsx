import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import FormWI from './pages/FormWI';
import FormOthers from './pages/FormOthers';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/form-wi" element={<FormWI />} />
          <Route path="/wi/:id" element={<FormWI />} />
          <Route path="/others" element={<FormOthers />} />
          <Route path="/others/:id" element={<FormOthers />} />
          <Route path="/admin" element={<div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-gray-600 font-medium">Ini adalah area Dashboard Admin Unit ISO.</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;