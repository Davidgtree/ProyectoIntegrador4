// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const API_PACIENTES = 'http://localhost:3000/api/pacientes';
const API_CITAS = 'http://localhost:3000/api/citas';
const API_HISTORIAS = 'http://localhost:3000/api/historias';

export const DashboardHome = () => {
  const { user } = useAuth();
  const nombre = user?.nombre || user?.usuario || 'usuario';

  const [stats, setStats] = useState([
    { label: 'Pacientes registrados', value: '-', detail: '' },
    { label: 'Citas de hoy', value: '-', detail: '' },
    { label: 'Consultas finalizadas', value: '-', detail: '' },
    { label: 'Citas pendientes', value: '-', detail: '' },
    { label: 'Citas reprogramadas', value: '-', detail: '' },
  ]);
  const [schedule, setSchedule] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarDashboard = async () => {
      setCargando(true);
      setError('');

      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const hoy = new Date();
      const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

      const formatearFecha = (valor) => {
        const fecha = new Date(valor);
        if (Number.isNaN(fecha.getTime())) return '';
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
      };

      try {
        const [pacientesRes, citasRes, historiasRes] = await Promise.all([
          fetch(API_PACIENTES, { headers }),
          fetch(API_CITAS, { headers }),
          fetch(API_HISTORIAS, { headers }),
        ]);

        const [pacientesData, citasData, historiasData] = await Promise.all([
          pacientesRes.json(),
          citasRes.json(),
          historiasRes.json(),
        ]);

        if (!pacientesRes.ok) throw new Error(pacientesData.message || 'Error cargando pacientes');
        if (!citasRes.ok) throw new Error(citasData.message || 'Error cargando citas');
        if (!historiasRes.ok) throw new Error(historiasData.message || 'Error cargando historias');

        const citas = Array.isArray(citasData) ? citasData : [];
        const historias = Array.isArray(historiasData) ? historiasData : [];

        const citasHoy = citas.filter((cita) =>
          formatearFecha(cita.fecha_hora_inicio) === fechaHoy &&
          ['Agendada', 'Pendiente', 'Reprogramada'].includes(cita.estado)
        );
        const citasPendientes = citas.filter((cita) => ['Agendada', 'Pendiente'].includes(cita.estado)).length;
        const citasReprogramadas = citas.filter((cita) => cita.estado === 'Reprogramada').length;
        const consultasFinalizadas = historias.filter((historia) => historia.bloqueada).length;

        setStats([
          { label: 'Pacientes registrados', value: String(pacientesData.length), detail: 'Total de pacientes activos' },
          { label: 'Citas de hoy', value: String(citasHoy.length), detail: 'Por atender hoy' },
          { label: 'Consultas finalizadas', value: String(consultasFinalizadas), detail: 'Historias cerradas' },
          { label: 'Citas pendientes', value: String(citasPendientes), detail: 'Pendientes en total' },
          { label: 'Citas reprogramadas', value: String(citasReprogramadas), detail: 'Reprogramadas totales' },
        ]);

        const agenda = citasHoy
          .filter((cita) => ['Agendada', 'Pendiente', 'Reprogramada'].includes(cita.estado))
          .sort((a, b) => new Date(a.fecha_hora_inicio) - new Date(b.fecha_hora_inicio))
          .slice(0, 3)
          .map((item) => ({
            time: new Date(item.fecha_hora_inicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
            patient: item.paciente_nombre || 'Paciente',
            status: item.estado || 'Sin estado',
          }));

        setSchedule(agenda);
      } catch (err) {
        setError(err.message || 'Error cargando dashboard');
      } finally {
        setCargando(false);
      }
    };

    cargarDashboard();
  }, []);

  return (
    <div className="dashboard-home">
      <section className="welcome-panel">
        <div>
          <span className="section-label">Resumen general</span>
          <h2>Bienvenido, {nombre}</h2>
          <p>Administra pacientes, citas, consultas e inventario desde un solo panel.</p>
        </div>
        <Link className="welcome-button" to="/dashboard/pacientes">
          Registrar paciente
        </Link>
      </section>

      {error && <div className="dashboard-error">{error}</div>}

      <section className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card dashboard-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{cargando ? '...' : stat.value}</strong>
            <small>{stat.detail}</small>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card panel-card">
          <div className="panel-heading">
            <div>
              <span className="section-label">Agenda</span>
              <h3>Próximas citas</h3>
            </div>
            <Link to="/dashboard/citas" className="dashboard-link-button">Ver agenda</Link>
          </div>

          <div className="schedule-list">
            {cargando ? (
              <p>Cargando agenda...</p>
            ) : schedule.length === 0 ? (
              <p>No hay citas para hoy.</p>
            ) : (
              schedule.map((item) => (
                <div className="schedule-item" key={`${item.time}-${item.patient}`}>
                  <strong>{item.time}</strong>
                  <span>{item.patient}</span>
                  <small>{item.status}</small>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="dashboard-card panel-card">
          <div className="panel-heading">
            <div>
              <span className="section-label">Accesos</span>
              <h3>Operaciones rápidas</h3>
            </div>
          </div>

          <div className="quick-actions">
            <Link to="/dashboard/pacientes">Nuevo paciente</Link>
            <Link to="/dashboard/citas">Nueva cita</Link>
            <Link to="/dashboard/consultas">Nueva consulta</Link>
            <button type="button" className="button-disabled" disabled title="Funcionalidad no implementada">
              Agregar producto
            </button>
          </div>
        </article>
      </section>
    </div>
  );
};

export const DashboardProfile = () => {
  return (
    <div className="dashboard-card profile-panel">
      <span className="section-label">Cuenta</span>
      <h2>Perfil del usuario</h2>
      <p>Aqui podras consultar y actualizar la informacion de tu cuenta.</p>
    </div>
  );
};
