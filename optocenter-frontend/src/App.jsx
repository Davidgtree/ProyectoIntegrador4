// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Registro } from './pages/Registro';
import { RecuperarPassword } from './pages/RecuperarPassword';
import { RestablecerPassword } from './pages/RestablecerPassword';
import { DashboardHome } from './pages/Dashboard';
import MiPerfil from './pages/MiPerfil';
import Reportes from './pages/Reportes';
import { Pacientes } from './pages/Pacientes';
import { Citas } from './pages/Citas';
import { Historias } from './pages/Historias';
import { Consulta } from './pages/Consulta';
import { Primos } from './pages/Primos';
import { Inventario } from './pages/Inventario';
import { Proveedores } from './pages/Proveedores';
import { Facturacion } from './pages/Facturacion';
import { Laboratorio } from './pages/Laboratorio';
import { Usuarios } from './pages/Usuarios';
import Roles from './pages/Roles';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar-password" element={<RecuperarPassword />} />
          <Route path="/restablecer-password" element={<RestablecerPassword />} />

          {/* Rutas Protegidas y Anidadas */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="perfil" element={<MiPerfil />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="pacientes" element={<Pacientes />} />
            <Route path="citas" element={<Citas />} />
            <Route path="historial" element={<Historias />} />
            <Route path="consultas" element={<Consulta />} />
            <Route path="primos" element={<Primos />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="proveedores" element={<Proveedores />} />
            <Route path="facturacion" element={<Facturacion />} />
            <Route path="laboratorio" element={<Laboratorio />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="roles" element={<Roles />} />
          </Route>

          {/* Redirección por defecto si la ruta no existe */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
