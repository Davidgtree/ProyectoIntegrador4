// src/components/Layout.jsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MENU_ITEMS, hasPermission } from '../utils/permissions';
import './Layout.css';

const ROLE_LABELS = {
  1: 'Administrador',
  2: 'Optómetra',
  3: 'Cajero',
  4: 'Recepcion',
};

export const Layout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleId = Number(user?.rol_id);
  const roleLabel = ROLE_LABELS[roleId] || 'Administrador';
  const displayName = user?.nombre || 'Danilo Calderón';
  const now = new Date();
  const currentDate = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentTime = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const visibleMenuItems = MENU_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(roleId, item.permission);
  });

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-row">
            <div className="sidebar-logo">OC</div>
            <button className="sidebar-notification" type="button" aria-label="Notificaciones">
              🔔
            </button>
          </div>

          <div>
            <strong>OptoCenter</strong>
            <span>Clínica óptica</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          {visibleMenuItems.map((item) =>
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
          <div className="topbar-user">
            <div className="topbar-user-avatar">{displayName.charAt(0).toUpperCase()}</div>
            <div className="topbar-user-details">
              <strong>{displayName}</strong>
              <span>{roleLabel} · Sesión activa</span>
              <small>{`${currentDate} · ${currentTime}`}</small>
            </div>
          </div>
        </header>

        <div className="dashboard-layout">
          <section className="dashboard-content">
            <Outlet />
          </section>
        </div>
      </main>
    </div>
  );
};
