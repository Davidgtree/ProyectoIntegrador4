// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { DashboardHome, DashboardProfile } from './pages/Dashboard';
import { Pacientes } from './pages/Pacientes';
import { Primos } from './pages/Primos';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />

          {/* Rutas Protegidas y Anidadas */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Rutas hijas que se renderizan dentro del Layout (Outlet) */}
            <Route index element={<DashboardHome />} />
            <Route path="perfil" element={<DashboardProfile />} />
            <Route path="pacientes" element={<Pacientes />} />
            <Route path="primos" element={<Primos />} />
          </Route>

          {/* Redirección por defecto si la ruta no existe */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;