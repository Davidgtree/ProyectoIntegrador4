import { useEffect, useMemo, useState } from 'react';
import './Inventario.css';

const API_LABORATORIO = 'http://localhost:3000/api/laboratorio';
const API_PACIENTES = 'http://localhost:3000/api/pacientes';
const API_HISTORIAS = 'http://localhost:3000/api/historias';

const initialForm = {
  paciente_id: '',
  historia_id: '',
  laboratorio_externo: '',
  telefono_laboratorio: '',
  descripcion_mica: '',
  descripcion_armazon: '',
  observaciones: '',
  fecha_prometida: '',
  estado: 'Emitida',
};

export const Laboratorio = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cedula, setCedula] = useState('');
  const [paciente, setPaciente] = useState(null);
  const [historias, setHistorias] = useState([]);
  const [historiaSeleccionada, setHistoriaSeleccionada] = useState(null);
  const [buscandoPaciente, setBuscandoPaciente] = useState(false);

  const getToken = () => localStorage.getItem('token');
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  }), []);

  const cargarOrdenes = async () => {
    setCargando(true);
    setError('');
    try {
      const response = await fetch(API_LABORATORIO, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudieron cargar las órdenes');
      setOrdenes(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarOrdenes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((actual) => ({ ...actual, [name]: value }));
  };

  const buscarPaciente = async () => {
    if (!cedula.trim()) {
      setError('Ingrese la cédula del paciente');
      return;
    }

    setBuscandoPaciente(true);
    setError('');
    setPaciente(null);
    setHistorias([]);
    setHistoriaSeleccionada(null);
    setForm((actual) => ({ ...actual, paciente_id: '', historia_id: '' }));

    try {
      const response = await fetch(`${API_PACIENTES}?buscar=${encodeURIComponent(cedula)}`, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo buscar el paciente');

      const encontrado = Array.isArray(data) ? data[0] : null;
      if (!encontrado) {
        setError('No se encontró un paciente con esa cédula');
        return;
      }

      setPaciente(encontrado);
      setForm((actual) => ({ ...actual, paciente_id: encontrado.paciente_id }));

      const historiasResponse = await fetch(`${API_HISTORIAS}?paciente_id=${encontrado.paciente_id}`, { headers });
      const historiasData = await historiasResponse.json();
      if (!historiasResponse.ok) throw new Error(historiasData.message || 'No se pudieron cargar las historias');
      setHistorias(Array.isArray(historiasData) ? historiasData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBuscandoPaciente(false);
    }
  };

  const handleHistoriaChange = (e) => {
    const historiaId = e.target.value;
    setForm((actual) => ({ ...actual, historia_id: historiaId }));
    const seleccionada = historias.find((item) => String(item.historia_id) === String(historiaId)) || null;
    setHistoriaSeleccionada(seleccionada);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');
    setError('');

    try {
      const response = await fetch(API_LABORATORIO, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...form,
          paciente_id: Number(form.paciente_id) || null,
          historia_id: form.historia_id ? Number(form.historia_id) : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo crear la orden');
      setMensaje(data.message);
      setForm(initialForm);
      cargarOrdenes();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const actualizarEstado = async (ordenId, estado) => {
    try {
      const response = await fetch(`${API_LABORATORIO}/${ordenId}/estado`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ estado, detalle: `Cambio a ${estado}` }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo actualizar el estado');
      setMensaje(data.message);
      cargarOrdenes();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="inventory-page">
      <section className="inventory-header">
        <div>
          <span className="section-label">Laboratorio</span>
          <h2>Órdenes de laboratorio</h2>
          <p>Crea órdenes desde la receta o la historia clínica y sigue su estado hasta la entrega.</p>
        </div>
      </section>

      <section className="inventory-layout">
        <form className="inventory-form dashboard-card" onSubmit={handleSubmit}>
          <div className="form-heading">
            <h3>Nueva orden</h3>
          </div>

          {(mensaje || error) && (
            <div className={error ? 'appointment-alert appointment-alert-error' : 'appointment-alert'}>
              {error || mensaje}
            </div>
          )}

          <div className="inventory-grid">
            <label style={{ gridColumn: '1 / -1' }}>
              Buscar paciente por cédula
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Ej: 0501-1990-12345" />
                <button type="button" className="ghost-button" onClick={buscarPaciente} disabled={buscandoPaciente}>
                  {buscandoPaciente ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </label>

            <label>
              Paciente seleccionado
              <input value={paciente ? `${paciente.nombres} ${paciente.apellidos}` : ''} readOnly />
            </label>

            <label>
              Historia clínica
              <select name="historia_id" value={form.historia_id} onChange={handleHistoriaChange}>
                <option value="">Sin historia clínica</option>
                {historias.map((historia) => (
                  <option key={historia.historia_id} value={historia.historia_id}>
                    {historia.motivo_consulta || `Historia ${historia.historia_id}`} — {historia.fecha_consulta?.slice(0, 10)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Laboratorio externo
              <input name="laboratorio_externo" value={form.laboratorio_externo} onChange={handleChange} />
            </label>

            <label>
              Teléfono laboratorio
              <input name="telefono_laboratorio" value={form.telefono_laboratorio} onChange={handleChange} />
            </label>

            <label>
              Descripción de la mica
              <input name="descripcion_mica" value={form.descripcion_mica} onChange={handleChange} />
            </label>

            <label>
              Descripción del armazón
              <input name="descripcion_armazon" value={form.descripcion_armazon} onChange={handleChange} />
            </label>

            <label>
              Fecha prometida
              <input type="date" name="fecha_prometida" value={form.fecha_prometida} onChange={handleChange} />
            </label>

            <label>
              Estado inicial
              <select name="estado" value={form.estado} onChange={handleChange}>
                <option value="Emitida">Emitida</option>
                <option value="Enviada">Enviada</option>
                <option value="En proceso">En proceso</option>
                <option value="Terminada">Terminada</option>
                <option value="Entregada">Entregada</option>
              </select>
            </label>

            {historiaSeleccionada && (
              <div style={{ gridColumn: '1 / -1', padding: '10px', border: '1px solid #d9e2ec', borderRadius: '8px', background: '#f8fafc' }}>
                <strong>Historia seleccionada</strong>
                <div style={{ marginTop: '6px', fontSize: '0.92rem' }}>
                  <div><strong>Fecha:</strong> {historiaSeleccionada.fecha_consulta?.slice(0, 10) || 'Sin fecha'}</div>
                  <div><strong>Motivo:</strong> {historiaSeleccionada.motivo_consulta || 'Sin motivo registrado'}</div>
                  <div><strong>Optómetra:</strong> {historiaSeleccionada.optometra_nombre || 'Sin asignar'}</div>
                  <div><strong>Diagnóstico:</strong> {historiaSeleccionada.descripcion_cie10 || 'Sin diagnóstico registrado'}</div>
                  <div><strong>Receta:</strong> {historiaSeleccionada.indicaciones_receta || 'Sin receta registrada'}</div>
                </div>
              </div>
            )}

            <label style={{ gridColumn: '1 / -1' }}>
              Observaciones
              <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={3} />
            </label>
          </div>

          <button type="submit" className="submit-button" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Crear orden'}
          </button>
        </form>

        <section className="dashboard-card" style={{ minHeight: 420 }}>
          <div className="form-heading">
            <h3>Órdenes registradas</h3>
          </div>

          {cargando ? (
            <p>Cargando órdenes...</p>
          ) : ordenes.length === 0 ? (
            <p>No hay órdenes aún.</p>
          ) : (
            <div className="inventory-list" style={{ display: 'grid', gap: '12px' }}>
              {ordenes.map((orden) => (
                <div key={orden.orden_id} className="inventory-item">
                  <div>
                    <strong>{orden.numero_orden}</strong>
                    <div>{orden.paciente_nombre || `Paciente ${orden.paciente_id}`}</div>
                    <small>Estado: {orden.estado}</small>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" className="ghost-button" onClick={() => actualizarEstado(orden.orden_id, 'Enviada')}>
                      Enviar
                    </button>
                    <button type="button" className="ghost-button" onClick={() => actualizarEstado(orden.orden_id, 'En proceso')}>
                      Procesar
                    </button>
                    <button type="button" className="ghost-button" onClick={() => actualizarEstado(orden.orden_id, 'Terminada')}>
                      Terminar
                    </button>
                    <button type="button" className="ghost-button" onClick={() => actualizarEstado(orden.orden_id, 'Entregada')}>
                      Entregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
};
