import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAppointmentAccessPolicy } from '../utils/permissions';
import { CalendarPicker } from '../components/CalendarPicker';
import './Citas.css';

const API_URL = 'http://localhost:3000/api/citas';

const initialForm = {
  cita_id: null,
  paciente_id: '',
  optometra_id: '',
  fecha_hora_inicio: '',
  fecha_hora_fin: '',
  motivo: '',
  requiere_pago_previo: false,
};

const toInputDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '-';

export const Citas = () => {
  const { user } = useAuth();
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [optometras, setOptometras] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [verificandoPago, setVerificandoPago] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  const editando = useMemo(() => Boolean(form.cita_id), [form.cita_id]);
  const policy = useMemo(() => getAppointmentAccessPolicy(user?.rol_id), [user?.rol_id]);
  const getToken = () => localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };

  const cargarOpciones = async () => {
    const response = await fetch(`${API_URL}/opciones`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'No se pudieron cargar opciones');
    setPacientes(data.pacientes || []);
    setOptometras(data.optometras || []);
  };

  const cargarCitas = async () => {
    setCargando(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (fechaFiltro) params.set('fecha', fechaFiltro);
      if (busqueda.trim()) params.set('buscar', busqueda.trim());

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudieron consultar las citas');
      setCitas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarOpciones().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    cargarCitas();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const limpiarFormulario = () => {
    setForm(initialForm);
    setMensaje('');
    setError('');
    setMostrarCalendario(false);
  };

  const handleCalendarSelect = ({ inicio, fin }) => {
    setForm((actual) => ({
      ...actual,
      fecha_hora_inicio: inicio,
      fecha_hora_fin: fin,
    }));
    setMostrarCalendario(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!policy.canCreateEditAppointment) {
      setError('Tu rol no permite agendar ni reprogramar citas.');
      return;
    }

    setGuardando(true);
    setMensaje('');
    setError('');

    try {
      const url = editando ? `${API_URL}/${form.cita_id}` : API_URL;
      const method = editando ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo guardar la cita');

      setMensaje(data.message);
      setForm(initialForm);
      await cargarCitas();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const editarCita = (cita) => {
    if (!policy.canCreateEditAppointment) {
      setError('Tu rol no permite editar citas.');
      return;
    }

    const estado = String(cita.estado || '').toLowerCase();
    if (!['agendada', 'reprogramada'].includes(estado)) {
      setError('Solo puedes editar citas pendientes de atención.');
      return;
    }

    setMensaje('');
    setError('');
    setMostrarCalendario(false);
    setForm({
      cita_id: cita.cita_id,
      paciente_id: String(cita.paciente_id),
      optometra_id: String(cita.optometra_id),
      fecha_hora_inicio: cita.fecha_hora_inicio,
      fecha_hora_fin: cita.fecha_hora_fin,
      motivo: cita.motivo || '',
      requiere_pago_previo: Boolean(cita.requiere_pago_previo),
    });
  };

  const cancelarCita = async (cita) => {
    if (!policy.canCancelAppointment) {
      setError('Tu rol no permite cancelar citas.');
      return;
    }

    const estado = String(cita.estado || '').toLowerCase();
    if (['cancelada', 'atendida'].includes(estado)) {
      setError('No se puede cancelar una cita ya atendida o cancelada.');
      return;
    }

    const confirmar = window.confirm(`Deseas cancelar la cita de ${cita.paciente_nombre}?`);
    if (!confirmar) return;

    const notas_cancelacion = window.prompt('Motivo de cancelacion:', '') || '';

    try {
      const response = await fetch(`${API_URL}/${cita.cita_id}/cancelar`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ notas_cancelacion }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo cancelar la cita');
      setMensaje(data.message);
      await cargarCitas();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    cargarCitas();
  };

  const verificarPagoCita = async (cita) => {
    if (!policy.canConfirmPayment) {
      setError('Tu rol no permite confirmar pagos manualmente.');
      return;
    }

    const confirmar = window.confirm(`Deseas marcar como pagada la cita de ${cita.paciente_nombre}?`);
    if (!confirmar) return;

    setVerificandoPago(true);
    setError('');
    setMensaje('');

    try {
      const response = await fetch(`${API_URL}/${cita.cita_id}/pago`, {
        method: 'PATCH',
        headers,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo verificar el pago');
      setMensaje(data.message);
      await cargarCitas();
    } catch (err) {
      setError(err.message);
    } finally {
      setVerificandoPago(false);
    }
  };

  return (
    <div className="appointments-page">
      <section className="appointments-header">
        <div>
          <span className="section-label">Agenda clinica</span>
          <h2>Citas</h2>
          <p>Agenda, consulta, reprograma y cancela citas con asignacion de optometra.</p>
        </div>
      </section>

      <section className="appointments-layout">
        <form className="appointment-form dashboard-card" onSubmit={handleSubmit}>
          <div className="form-heading">
            <h3>{editando ? 'Reprogramar cita' : 'Agendar cita'}</h3>
            {editando && policy.canCreateEditAppointment && (
              <button type="button" className="ghost-button" onClick={limpiarFormulario}>
                Cancelar edicion
              </button>
            )}
          </div>

          {(mensaje || error) && (
            <div className={error ? 'appointment-alert appointment-alert-error' : 'appointment-alert'}>
              {error || mensaje}
            </div>
          )}

          {!policy.canCreateEditAppointment ? (
            <div className="patient-alert">
              Solo puedes ver tus citas asignadas. No puedes agendar ni modificar citas.
            </div>
          ) : null}

          <div className="appointment-grid">
            <label>
              Paciente *
              <select name="paciente_id" value={form.paciente_id} onChange={handleChange} required>
                <option value="">Seleccionar paciente</option>
                {pacientes.map((paciente) => (
                  <option key={paciente.paciente_id} value={paciente.paciente_id}>
                    {paciente.nombres} {paciente.apellidos} - {paciente.numero_identidad}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Optometra *
              <select name="optometra_id" value={form.optometra_id} onChange={handleChange} required>
                <option value="">Seleccionar optometra</option>
                {optometras.map((optometra) => (
                  <option key={optometra.empleado_id} value={optometra.empleado_id}>
                    {optometra.nombres} {optometra.apellidos}
                  </option>
                ))}
              </select>
            </label>

            <label className="appointment-grid-full">
              Seleccionar Fecha y Turno *
              <button
                type="button"
                onClick={() => setMostrarCalendario(!mostrarCalendario)}
                className="calendar-toggle-button"
              >
                {form.fecha_hora_inicio
                  ? `📅 ${formatDateTime(form.fecha_hora_inicio)}`
                  : 'Haz clic para seleccionar fecha y hora'}
              </button>
              {mostrarCalendario && (
                <CalendarPicker
                  onDateTimeSelect={handleCalendarSelect}
                  initialDate={form.fecha_hora_inicio}
                />
              )}
            </label>

            <label className="appointment-grid-full">
              Motivo
              <textarea name="motivo" value={form.motivo} onChange={handleChange} maxLength="300" />
            </label>

            <label className="checkbox-field appointment-grid-full">
              <input
                type="checkbox"
                name="requiere_pago_previo"
                checked={form.requiere_pago_previo}
                onChange={handleChange}
              />
              Requiere pago previo antes de la atencion
            </label>
          </div>

          {policy.canCreateEditAppointment ? (
            <button type="submit" className="primary-button" disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Actualizar cita' : 'Agendar cita'}
            </button>
          ) : null}
        </form>

        <section className="appointments-list dashboard-card">
          <form className="appointments-search" onSubmit={handleBuscar}>
            <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar paciente, optometra o estado"
            />
            <button type="submit">Consultar</button>
          </form>

          <div className="appointments-table-wrap">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Horario</th>
                  <th>Paciente</th>
                  <th>Optometra</th>
                  <th>Estado</th>
                  <th>Pago</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan="6">Cargando citas...</td>
                  </tr>
                ) : citas.length === 0 ? (
                  <tr>
                    <td colSpan="6">No hay citas registradas.</td>
                  </tr>
                ) : (
                  citas.map((cita) => (
                    <tr key={cita.cita_id}>
                      <td>
                        <strong>{formatDateTime(cita.fecha_hora_inicio)}</strong>
                        <span>Hasta {formatDateTime(cita.fecha_hora_fin)}</span>
                      </td>
                      <td>
                        <strong>{cita.paciente_nombre}</strong>
                        <span>{cita.paciente_identidad}</span>
                        <span>{cita.motivo || 'Sin motivo registrado'}</span>
                      </td>
                      <td>{cita.optometra_nombre}</td>
                      <td>
                        <span className={`appointment-status status-${String(cita.estado).toLowerCase()}`}>
                          {cita.estado}
                        </span>
                      </td>
                      <td>{cita.requiere_pago_previo ? (cita.pago_verificado ? 'Verificado' : 'Pendiente') : 'No requiere'}</td>
                      <td>
                        <div className="table-actions">
                          {policy.canCreateEditAppointment && ['Agendada', 'Reprogramada'].includes(String(cita.estado || '')) && (
                            <button type="button" className="table-button" onClick={() => editarCita(cita)}>
                              Editar
                            </button>
                          )}
                          {policy.canConfirmPayment && cita.requiere_pago_previo && !cita.pago_verificado && (
                            <button
                              type="button"
                              className="table-button payment-button"
                              onClick={() => verificarPagoCita(cita)}
                              disabled={verificandoPago}
                            >
                              {verificandoPago ? 'Verificando...' : 'Confirmar pago'}
                            </button>
                          )}
                          {policy.canManageClinicalConsults && cita.pago_verificado && !['Cancelada', 'Atendida'].includes(String(cita.estado || '')) && (
                            <Link
                              className="table-button"
                              to={`/dashboard/consultas?cita_id=${cita.cita_id}&paciente_id=${cita.paciente_id}&optometra_id=${cita.optometra_id}`}
                            >
                              Nueva consulta
                            </Link>
                          )}
                          {policy.canCancelAppointment && !['Cancelada', 'Atendida'].includes(String(cita.estado || '')) && (
                            <button
                              type="button"
                              className="table-button danger-button"
                              onClick={() => cancelarCita(cita)}
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
};
