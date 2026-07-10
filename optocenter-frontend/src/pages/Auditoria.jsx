import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auditoria.css';

const API_AUDITORIA = 'http://localhost:3000/api/auth/auditoria';

export const Auditoria = () => {
  const { user, token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroDias, setFiltroDias] = useState('30');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const modulos = ['Auth', 'Citas', 'HistoriasClinicas', 'Pacientes', 'Facturas', 'Productos', 'Proveedores', 'Inventario'];

  const getHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  const cargarLogs = useCallback(async () => {
    try {
      setCargando(true);
      setError('');
      
      let url = `${API_AUDITORIA}?dias=${filtroDias}`;
      if (filtroModulo) url += `&modulo=${filtroModulo}`;
      if (filtroAccion) url += `&accion=${filtroAccion}`;

      const response = await fetch(url, { headers: getHeaders() });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error cargando auditoría');
      }

      setLogs(data.logs || []);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || 'Error al cargar auditoría');
    } finally {
      setCargando(false);
    }
  }, [filtroModulo, filtroAccion, filtroDias, getHeaders]);

  useEffect(() => {
    cargarLogs();
  }, [cargarLogs]);

  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const obtenerAccionesUnicas = () => {
    const acciones = new Set();
    logs.forEach((log) => {
      acciones.add(log.accion);
    });
    return Array.from(acciones).sort();
  };

  const pageCount = Math.max(1, Math.ceil(logs.length / itemsPerPage));
  const currentPageLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const mostrarDesde = logs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const mostrarHasta = Math.min(currentPage * itemsPerPage, logs.length);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  if (user?.rol_id !== 1) {
    return (
      <div className="auditoria-page">
        <div className="auditoria-header">
          <h2>Acceso denegado</h2>
          <p>Solo administradores pueden acceder al registro de auditoría.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auditoria-page">
      <div className="auditoria-header">
        <span className="section-label">Gestión</span>
        <h2>Auditoría del Sistema</h2>
        <p>Registro de todas las acciones realizadas por usuarios en el sistema.</p>
      </div>

      <div className="auditoria-filtros">
        <div className="filtro-grupo">
          <label>Módulo:</label>
          <select value={filtroModulo} onChange={(e) => setFiltroModulo(e.target.value)}>
            <option value="">Todos</option>
            {modulos.map((mod) => (
              <option key={mod} value={mod}>
                {mod}
              </option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <label>Acción:</label>
          <select value={filtroAccion} onChange={(e) => setFiltroAccion(e.target.value)}>
            <option value="">Todas</option>
            {obtenerAccionesUnicas().map((accion) => (
              <option key={accion} value={accion}>
                {accion}
              </option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <label>Últimos (días):</label>
          <select value={filtroDias} onChange={(e) => setFiltroDias(e.target.value)}>
            <option value="7">7 días</option>
            <option value="30">30 días</option>
            <option value="90">90 días</option>
            <option value="365">1 año</option>
          </select>
        </div>

        <button className="primary-button" onClick={cargarLogs}>
          Actualizar
        </button>
      </div>

      {error && <div className="auditoria-error">{error}</div>}
      {cargando && <div className="auditoria-cargando">Cargando auditoría...</div>}

      {!cargando && logs.length === 0 && (
        <div className="auditoria-vacio">
          <p>No hay registros de auditoría con los filtros seleccionados.</p>
        </div>
      )}

      {!cargando && logs.length > 0 && (
        <div className="auditoria-tabla-contenedor">
          <table className="auditoria-tabla">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Usuario</th>
                <th>Módulo</th>
                <th>Acción</th>
                <th>Tabla</th>
                <th>ID Registro</th>
                <th>Detalle</th>
                <th>IP Origen</th>
              </tr>
            </thead>
            <tbody>
              {currentPageLogs.map((log) => (
                <tr key={log.audit_id}>
                  <td>{formatearFecha(log.fecha_hora)}</td>
                  <td>{log.empleado_id || 'Sistema'}</td>
                  <td>
                    <span className={`badge badge-${log.modulo.toLowerCase()}`}>{log.modulo}</span>
                  </td>
                  <td>{log.accion}</td>
                  <td>{log.tabla_afectada || '-'}</td>
                  <td>{log.registro_id || '-'}</td>
                  <td className="auditoria-detalle" title={log.detalle}>
                    {log.detalle ? log.detalle.substring(0, 50) + '...' : '-'}
                  </td>
                  <td className="auditoria-ip">{log.ip_origen}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="auditoria-pagination">
            <div className="auditoria-pagination-info">
              Mostrando {mostrarDesde} - {mostrarHasta} de {logs.length} registros
            </div>
            <div className="auditoria-pagination-actions">
              <label>
                Mostrar:
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </select>
              </label>
              <button
                type="button"
                className="auditoria-button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="auditoria-button"
                disabled={currentPage === pageCount}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pageCount))}
              >
                Siguiente
              </button>
            </div>
          </div>
          <div className="auditoria-info">
            <p>Total de registros: <strong>{logs.length}</strong></p>
          </div>
        </div>
      )}
    </div>
  );
};
