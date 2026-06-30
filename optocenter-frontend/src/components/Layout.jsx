// src/components/Layout.jsx
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Layout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Menú Principal Lateral */}
      <nav style={{ width: '250px', background: '#f0f0f0', padding: '20px' }}>
        <h3>Menú Principal</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ margin: '10px 0' }}><Link to="/dashboard">Inicio</Link></li>
          <li style={{ margin: '10px 0' }}><Link to="/dashboard/perfil">Mi Perfil</Link></li>
          <li style={{ margin: '10px 0' }}><Link to="/dashboard/pacientes">Crear Pacientes</Link></li>
          <li style={{ margin: '10px 0' }}><Link to="/dashboard/primos">Ejercicio Primos</Link></li>
        </ul>
        <button onClick={handleLogout} style={{ marginTop: '50px' }}>
          Cerrar Sesión
        </button>
      </nav>

      {/* Contenido Dinámico de las Páginas */}
      <main style={{ flex: 1, padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  );
};