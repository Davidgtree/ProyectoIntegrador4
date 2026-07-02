// src/components/Layout.jsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const ROLE_LABELS = {
  1: 'Administrador',
  2: 'Optómetra',
  3: 'Cajero',
  4: 'Vendedor',
};

export const Layout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleId = user?.rol_id;
  const roleLabel = ROLE_LABELS[roleId] || 'Usuario';

  const menuItems = [
    { label: 'Inicio', to: '/dashboard', icon: 'IN', end: true, roles: [1, 2, 3, 4] },
    { label: 'Pacientes', to: '/dashboard/pacientes', icon: 'PA', roles: [1, 2, 3, 4] },
    { label: 'Citas', to: '/dashboard/citas', icon: 'CI', roles: [1, 2, 3] },
    { label: 'Historias', to: '/dashboard/historial', icon: 'HI', roles: [1, 2] },
    { label: 'Consultas', to: '/dashboard/consultas', icon: 'CO', roles: [1, 2] },
    { label: 'Inventario', to: '/dashboard/inventario', icon: 'IV', roles: [1, 3, 4] },
    { label: 'Proveedores', to: '/dashboard/proveedores', icon: 'PV', roles: [1, 3] },
    { label: 'Facturacion', to: '/dashboard/facturacion', icon: 'FA', roles: [1, 3, 4] },
    { label: 'Reportes', icon: 'RE', disabled: true, roles: [1] },
    { label: 'Mi Perfil', to: '/dashboard/perfil', icon: 'MP', roles: [1, 2, 3, 4] },
  ];

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">OC</div>
          <div>
            <strong>OptoCenter</strong>
            <span>Clinica optica</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          {menuItems
            .filter((item) => item.roles.includes(roleId))
            .map((item) =>
              item.disabled ? (
                <button key={item.label} type="button" className="sidebar-link sidebar-link-disabled">
                  <span className="sidebar-icon">{item.icon}</span>
                  {item.label}
                </button>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link'
                  }
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              )
            )}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {(user?.nombre || user?.usuario || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{user?.nombre || user?.usuario || 'Usuario'}</strong>
            <span>{roleLabel} · Sesion activa</span>
          </div>
        </div>

        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          Cerrar sesion
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="dashboard-kicker">Panel administrativo</span>
            <h1>Gestion optometrica</h1>
          </div>
          <button type="button" className="dashboard-action">
            Nueva cita
          </button>
        </header>

        <section className="dashboard-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
};
