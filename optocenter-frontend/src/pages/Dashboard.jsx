// src/pages/Dashboard.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import './Dashboard.css';

const API_PACIENTES = 'http://localhost:3000/api/pacientes';
const API_CITAS = 'http://localhost:3000/api/citas';
const API_HISTORIAS = 'http://localhost:3000/api/historias';
const API_BILLING = 'http://localhost:3000/api/facturacion';
const API_PRODUCTOS = 'http://localhost:3000/api/productos';

export const DashboardHome = () => {
  const { user, token } = useAuth();
  const nombre = user?.nombre || user?.usuario || 'usuario';
  const roleId = Number(user?.rol_id);
  const puedeVerPacientes = hasPermission(roleId, 'Pacientes');
  const puedeVerCitas = hasPermission(roleId, 'Citas');
  const puedeVerHistorias = hasPermission(roleId, 'Historias');
  const puedeVerConsultas = hasPermission(roleId, 'Consultas');
  const puedeVerInventario = hasPermission(roleId, 'Inventario');
  const puedeVerProveedores = hasPermission(roleId, 'Proveedores');
  const puedeVerFacturacion = hasPermission(roleId, 'Facturación');
  const puedeVerUsuarios = hasPermission(roleId, 'Usuarios');
  const puedeVerReportes = hasPermission(roleId, 'Reportes');
  const esAdmin = roleId === 1 || (puedeVerUsuarios && puedeVerReportes && puedeVerFacturacion && puedeVerInventario);
  const esOptometra = !esAdmin && (puedeVerCitas || puedeVerHistorias || puedeVerConsultas);
  const esCajero = !esAdmin && puedeVerFacturacion && !puedeVerInventario;
  const esRecepcion = !esAdmin && !esOptometra && puedeVerCitas && !puedeVerFacturacion && !puedeVerInventario;

  const [pacientes, setPacientes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [historias, setHistorias] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [roleError, setRoleError] = useState('');

  const getHeaders = useCallback(() => {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }, [token]);

  const calcularStats = useCallback(({ pacientes, citas, historias, ventas, facturas, productos }) => {
    const pacientesCount = pacientes.length;
    const citasHoy = citas.filter((cita) => {
      const fecha = new Date(cita.fecha_hora_inicio);
      const hoy = new Date();
      return (
        fecha.getFullYear() === hoy.getFullYear() &&
        fecha.getMonth() === hoy.getMonth() &&
        fecha.getDate() === hoy.getDate() &&
        ['Agendada', 'Pendiente', 'Reprogramada'].includes(cita.estado)
      );
    });
    const citasPendientes = citas.filter((cita) => ['Agendada', 'Pendiente'].includes(cita.estado)).length;
    const citasReprogramadas = citas.filter((cita) => cita.estado === 'Reprogramada').length;
    const consultasFinalizadas = historias.filter((historia) => historia.bloqueada).length;
    const ventasTotales = ventas.length;
    const facturasTotales = facturas.length;
    const productosTotales = productos.length;
    const productosBajoStock = productos.filter((producto) => Number(producto.stock_actual) <= Number(producto.stock_minimo)).length;

    if (esAdmin) {
      return [
        { label: 'Pacientes registrados', value: String(pacientesCount), detail: 'Total de pacientes activos' },
        { label: 'Ventas registradas', value: String(ventasTotales), detail: 'Ventas en el sistema' },
        { label: 'Facturas generadas', value: String(facturasTotales), detail: 'Documentos emitidos' },
        { label: 'Productos en stock', value: String(productosTotales), detail: 'Items disponibles' },
        { label: 'Citas próximas', value: String(citasHoy.length), detail: 'Por atender hoy' },
      ];
    }

    if (esOptometra) {
      return [
        { label: 'Pacientes registrados', value: String(pacientesCount), detail: 'Total de pacientes activos' },
        { label: 'Citas de hoy', value: String(citasHoy.length), detail: 'Por atender hoy' },
        { label: 'Consultas finalizadas', value: String(consultasFinalizadas), detail: 'Historias cerradas' },
        { label: 'Citas pendientes', value: String(citasPendientes), detail: 'Pendientes en total' },
        { label: 'Citas reprogramadas', value: String(citasReprogramadas), detail: 'Reprogramadas totales' },
      ];
    }

    if (esCajero) {
      return [
        { label: 'Ventas del sistema', value: String(ventasTotales), detail: 'Operaciones registradas' },
        { label: 'Facturas emitidas', value: String(facturasTotales), detail: 'Documentos fiscales' },
        { label: 'Clientes activos', value: String(pacientesCount), detail: 'Pacientes registrados' },
        { label: 'Citas pendientes', value: String(citasPendientes), detail: 'Por confirmar o cobrar' },
        { label: 'Citas reprogramadas', value: String(citasReprogramadas), detail: 'Citas movidas' },
      ];
    }

    if (esRecepcion) {
      return [
        { label: 'Productos en stock', value: String(productosTotales), detail: 'Items disponibles' },
        { label: 'Venta total', value: String(ventasTotales), detail: 'Transacciones registradas' },
        { label: 'Facturas generadas', value: String(facturasTotales), detail: 'Documentos emitidos' },
        { label: 'Productos bajo stock', value: String(productosBajoStock), detail: 'Necesitan reposición' },
        { label: 'Clientes activos', value: String(pacientesCount), detail: 'Pacientes registrados' },
      ];
    }

    return [
      { label: 'Pacientes registrados', value: String(pacientesCount), detail: 'Total de pacientes activos' },
      { label: 'Citas de hoy', value: String(citasHoy.length), detail: 'Por atender hoy' },
      { label: 'Consultas finalizadas', value: String(consultasFinalizadas), detail: 'Historias cerradas' },
    ];
  }, [esAdmin, esOptometra, esCajero, esRecepcion]);

  const stats = useMemo(
    () => calcularStats({ pacientes, citas, historias, ventas, facturas, productos }),
    [calcularStats, pacientes, citas, historias, ventas, facturas, productos]
  );

  useEffect(() => {
    const cargarDatosGenerales = async () => {
      setCargando(true);
      setError('');

      try {
        const headers = getHeaders();
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

        const hoy = new Date();
        const citasHoy = citas.filter((cita) => {
          const fecha = new Date(cita.fecha_hora_inicio);
          return (
            fecha.getFullYear() === hoy.getFullYear() &&
            fecha.getMonth() === hoy.getMonth() &&
            fecha.getDate() === hoy.getDate() &&
            ['Agendada', 'Pendiente', 'Reprogramada'].includes(cita.estado)
          );
        });

        setPacientes(Array.isArray(pacientesData) ? pacientesData : []);
        setCitas(citas);
        setHistorias(historias);
        setSchedule(citasHoy
          .sort((a, b) => new Date(a.fecha_hora_inicio) - new Date(b.fecha_hora_inicio))
          .slice(0, 3)
          .map((item) => ({
            time: new Date(item.fecha_hora_inicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
            patient: item.paciente_nombre || 'Paciente',
            status: item.estado || 'Sin estado',
          }))
        );

        setError('');
      } catch (err) {
        setError(err.message || 'Error cargando dashboard');
      } finally {
        setCargando(false);
      }
    };

    const cargarFacturacion = async () => {
      try {
        const headers = getHeaders();
        const [ventasRes, facturasRes] = await Promise.all([
          fetch(`${API_BILLING}/ventas`, { headers }),
          fetch(`${API_BILLING}/facturas`, { headers }),
        ]);

        const [ventasData, facturasData] = await Promise.all([
          ventasRes.json(),
          facturasRes.json(),
        ]);

        if (!ventasRes.ok) throw new Error(ventasData.message || 'Error cargando ventas');
        if (!facturasRes.ok) throw new Error(facturasData.message || 'Error cargando facturas');

        setVentas(Array.isArray(ventasData) ? ventasData : []);
        setFacturas(Array.isArray(facturasData) ? facturasData : []);
      } catch (err) {
        setRoleError(err.message || 'No se pudieron cargar datos de facturación');
      }
    };

    const cargarInventario = async () => {
      try {
        const headers = getHeaders();
        const productosRes = await fetch(API_PRODUCTOS, { headers });
        const productosData = await productosRes.json();
        if (!productosRes.ok) throw new Error(productosData.message || 'Error cargando productos');
        setProductos(Array.isArray(productosData) ? productosData : []);
      } catch (err) {
        setRoleError(err.message || 'No se pudieron cargar datos de inventario');
      }
    };

    cargarDatosGenerales();

    if (esAdmin || esCajero || esRecepcion) {
      cargarFacturacion();
      cargarInventario();
    }
  }, [esAdmin, esOptometra, esCajero, esRecepcion, getHeaders]);


  const renderRolePanel = () => {
    const quickLinks = [
      { label: 'Pacientes', to: '/dashboard/pacientes', permission: 'Pacientes' },
      { label: 'Citas', to: '/dashboard/citas', permission: 'Citas' },
      { label: 'Consultas', to: '/dashboard/consultas', permission: 'Consultas' },
      { label: 'Historias', to: '/dashboard/historial', permission: 'Historias' },
      { label: 'Inventario', to: '/dashboard/inventario', permission: 'Inventario' },
      { label: 'Proveedores', to: '/dashboard/proveedores', permission: 'Proveedores' },
      { label: 'Facturación', to: '/dashboard/facturacion', permission: 'Facturación' },
      { label: 'Usuarios', to: '/dashboard/usuarios', permission: 'Usuarios' },
      { label: 'Reportes', to: '/dashboard/reportes', permission: 'Reportes' },
    ].filter((link) => hasPermission(roleId, link.permission));

    if (quickLinks.length === 0) return null;

    return (
      <article className="dashboard-card panel-card">
        <div className="panel-heading">
          <div>
            <span className="section-label">Acceso rápido</span>
            <h3>Modulos disponibles</h3>
          </div>
        </div>
        <div className="quick-actions">
          {quickLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </div>
      </article>
    );
  };

  return (
    <div className="dashboard-home">
      <section className="welcome-panel">
        <div>
          <span className="section-label">Resumen general</span>
          <h2>Bienvenido, {nombre}</h2>
          <p>Administra pacientes, citas, consultas e inventario desde un solo panel.</p>
        </div>
      </section>

      {(error || roleError) && <div className="dashboard-error">{error || roleError}</div>}

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
        {renderRolePanel()}
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
