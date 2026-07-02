import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Consulta.css';

const API_HISTORIAS = 'http://localhost:3000/api/historias';
const API_PACIENTES = 'http://localhost:3000/api/pacientes';
const API_OPCIONES_CITAS = 'http://localhost:3000/api/citas/opciones';

const initialForm = {
  historia_id: null,
  paciente_id: '',
  cita_id: '',
  optometra_id: '',
  fecha_consulta: '',
  bloqueada: false,
  motivo_consulta: '',
  antecedentes_personales: '',
  antecedentes_familiares: '',
  antecedentes_oculares: '',
  avsc_od_lejana: '',
  avsc_oi_lejana: '',
  avsc_od_cercana: '',
  avsc_oi_cercana: '',
  avcc_od_lejana: '',
  avcc_oi_lejana: '',
  avcc_od_cercana: '',
  avcc_oi_cercana: '',
  lens_od_esfera: '',
  lens_od_cilindro: '',
  lens_od_eje: '',
  lens_oi_esfera: '',
  lens_oi_cilindro: '',
  lens_oi_eje: '',
  examen_externo: '',
  reflejo_od: '',
  reflejo_oi: '',
  oftalmoscopia_od: '',
  oftalmoscopia_oi: '',
  examen_motor: '',
  rx_od_esfera: '',
  rx_od_cilindro: '',
  rx_od_eje: '',
  rx_od_adicion: '',
  rx_oi_esfera: '',
  rx_oi_cilindro: '',
  rx_oi_eje: '',
  rx_oi_adicion: '',
  distancia_pupilar: '',
  indicaciones_receta: '',
  codigo_cie10: '',
  descripcion_cie10: '',
  tipo_diagnostico: 'Presuntivo',
  observaciones_dx: '',
  tratamiento: '',
};

// Convierte lo que llega del backend (numeros, null) a texto para los inputs controlados
const normalizarParaFormulario = (data) => {
  const normalizado = { ...initialForm };
  Object.keys(initialForm).forEach((campo) => {
    if (data[campo] === null || data[campo] === undefined) return;
    normalizado[campo] = data[campo];
  });
  normalizado.historia_id = data.historia_id;
  normalizado.fecha_consulta = data.fecha_consulta || '';
  normalizado.bloqueada = Boolean(data.bloqueada);
  return normalizado;
};

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const CONSULTORIO_NOMBRE = 'Optocenter';

export const Consulta = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const historiaIdParam = searchParams.get('historia_id');
  const citaIdParam = searchParams.get('cita_id');
  const pacienteIdParam = searchParams.get('paciente_id');
  const optometraIdParam = searchParams.get('optometra_id');

  const [form, setForm] = useState(initialForm);
  const [pacienteInfo, setPacienteInfo] = useState(null);
  const [optometras, setOptometras] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const editando = useMemo(() => Boolean(form.historia_id), [form.historia_id]);
  const soloLectura = form.bloqueada;
  const getToken = () => localStorage.getItem('token');

  const optometraNombre = useMemo(() => {
    const opt = optometras.find((o) => String(o.empleado_id) === String(form.optometra_id));
    return opt ? `${opt.nombres} ${opt.apellidos}` : '';
  }, [form.optometra_id, optometras]);
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };

  const cargarPacienteInfo = async (pacienteId) => {
    if (!pacienteId) return;
    try {
      const response = await fetch(`${API_PACIENTES}/${pacienteId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      if (response.ok) setPacienteInfo(data);
    } catch {
      // silencioso: el encabezado del paciente es informativo, no bloquea el formulario
    }
  };

  const cargarOpciones = async () => {
    try {
      const response = await fetch(API_OPCIONES_CITAS, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      if (response.ok) {
        setOptometras(data.optometras || []);
        setPacientes(data.pacientes || []);
      }
    } catch {
      // silencioso: si falla, los selects de respaldo simplemente quedan vacios
    }
  };

  useEffect(() => {
    const inicializar = async () => {
      setCargando(true);
      setError('');
      await cargarOpciones();

      try {
        if (historiaIdParam) {
          const response = await fetch(`${API_HISTORIAS}/${historiaIdParam}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'No se pudo cargar la historia clinica');
          setForm(normalizarParaFormulario(data));
          await cargarPacienteInfo(data.paciente_id);
        } else if (citaIdParam) {
          const response = await fetch(`${API_HISTORIAS}/cita/${citaIdParam}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });

          if (response.status === 404) {
            setForm({
              ...initialForm,
              cita_id: citaIdParam,
              paciente_id: pacienteIdParam || '',
              optometra_id: optometraIdParam || '',
            });
            await cargarPacienteInfo(pacienteIdParam);
          } else {
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'No se pudo cargar la historia clinica');
            setForm(normalizarParaFormulario(data));
            await cargarPacienteInfo(data.paciente_id);
          }
        } else if (pacienteIdParam) {
          setForm({ ...initialForm, paciente_id: pacienteIdParam });
          await cargarPacienteInfo(pacienteIdParam);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historiaIdParam, citaIdParam, pacienteIdParam]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((actual) => ({ ...actual, [name]: value }));
  };

  const handlePacienteSeleccionado = async (e) => {
    const pacienteId = e.target.value;
    setForm((actual) => ({ ...actual, paciente_id: pacienteId }));
    await cargarPacienteInfo(pacienteId);
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje('');
    setError('');

    try {
      const url = editando ? `${API_HISTORIAS}/${form.historia_id}` : API_HISTORIAS;
      const method = editando ? 'PUT' : 'POST';

      const response = await fetch(url, { method, headers, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo guardar la historia clinica');

      setMensaje(data.message);
      if (data.historia_id) {
        setForm((actual) => ({ ...actual, historia_id: data.historia_id }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const finalizar = async () => {
    if (!form.historia_id) {
      setError('Primero guarda la historia clinica antes de finalizarla');
      return;
    }

    const confirmar = window.confirm(
      'Al finalizar, la historia clinica quedara bloqueada y no podra editarse. Deseas continuar?'
    );
    if (!confirmar) return;

    setGuardando(true);
    setMensaje('');
    setError('');

    try {
      const response = await fetch(`${API_HISTORIAS}/${form.historia_id}/finalizar`, {
        method: 'PATCH',
        headers,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo finalizar la historia clinica');

      setMensaje(data.message);
      setForm((actual) => ({ ...actual, bloqueada: true }));
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    guardar();
  };

  if (cargando) {
    return (
      <div className="clinical-page">
        <p>Cargando historia clinica...</p>
      </div>
    );
  }

  return (
    <div className="clinical-page">
      <section className="clinical-header">
        <div>
          <span className="section-label">Historia clínica de optometría</span>
          <h2>{editando ? 'Consulta registrada' : 'Nueva consulta'}</h2>
          <p className="clinical-description">
            Completa los datos clínicos del paciente para generar una historia óptica detallada y estructurada.
          </p>
        </div>
        <button type="button" className="ghost-button" onClick={() => navigate('/citas')}>
          Volver a citas
        </button>
      </section>

      <section className="clinical-card clinical-summary-card">
        <div className="clinical-summary-row">
          <div>
            <span>Fecha</span>
            <strong>{formatDate(form.fecha_consulta) || formatDate(new Date())}</strong>
          </div>
          <div>
            <span>Hora</span>
            <strong>{formatTime(form.fecha_consulta) || new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</strong>
          </div>
          <div>
            <span>Historia clínica N°</span>
            <strong>{form.historia_id || 'N/A'}</strong>
          </div>
          <div>
            <span>Consultorio</span>
            <strong>{CONSULTORIO_NOMBRE}</strong>
          </div>
        </div>

        <div className="clinical-summary-row clinical-summary-paciente">
          <div>
            <span>Apellidos</span>
            <strong>{pacienteInfo?.apellidos || '-'}</strong>
          </div>
          <div>
            <span>Nombres</span>
            <strong>{pacienteInfo?.nombres || '-'}</strong>
          </div>
          <div>
            <span>CI</span>
            <strong>{pacienteInfo?.numero_identidad || '-'}</strong>
          </div>
          <div>
            <span>Edad</span>
            <strong>{pacienteInfo?.edad != null ? `${pacienteInfo.edad} años` : '-'}</strong>
          </div>
          <div>
            <span>Género</span>
            <strong>{pacienteInfo?.genero || '-'}</strong>
          </div>
        </div>

        <div className="clinical-summary-row clinical-summary-paciente">
          <div>
            <span>Email</span>
            <strong>{pacienteInfo?.correo || '-'}</strong>
          </div>
          <div>
            <span>Teléfono</span>
            <strong>{pacienteInfo?.telefono || '-'}</strong>
          </div>
          <div className="clinical-summary-span-2">
            <span>Dirección</span>
            <strong>{pacienteInfo?.direccion || '-'}</strong>
          </div>
          <div>
            <span>Optómetra</span>
            <strong>{optometraNombre || '-'}</strong>
          </div>
        </div>
      </section>

      {(mensaje || error) && (
        <div className={error ? 'patient-alert patient-alert-error' : 'patient-alert'}>{error || mensaje}</div>
      )}

      <form className="clinical-form" onSubmit={handleSubmit}>
        <fieldset disabled={soloLectura} className="clinical-fieldset">
          {/* Datos de la cita / paciente */}
          <section className="dashboard-card clinical-section">
            <h3>Datos de la consulta</h3>
            <div className="form-grid">
              <label className="clinical-grid-full">
                Paciente *
                <select name="paciente_id" value={form.paciente_id} onChange={handlePacienteSeleccionado} required>
                  <option value="">Seleccionar paciente</option>
                  {pacientes.map((p) => (
                    <option key={p.paciente_id} value={p.paciente_id}>
                      {p.nombres} {p.apellidos} - {p.numero_identidad}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Optometra *
                <select name="optometra_id" value={form.optometra_id} onChange={handleChange} required>
                  <option value="">Seleccionar optometra</option>
                  {optometras.map((o) => (
                    <option key={o.empleado_id} value={o.empleado_id}>
                      {o.nombres} {o.apellidos}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Anamnesis */}
          <section className="dashboard-card clinical-section">
            <h3>Anamnesis</h3>
            <div className="form-grid">
              <label className="clinical-grid-full">
                Motivo de consulta *
                <textarea
                  name="motivo_consulta"
                  value={form.motivo_consulta}
                  onChange={handleChange}
                  maxLength="500"
                  required
                />
              </label>
              <label className="clinical-grid-full">
                Antecedentes personales
                <textarea name="antecedentes_personales" value={form.antecedentes_personales} onChange={handleChange} />
              </label>
              <label className="clinical-grid-full">
                Antecedentes familiares
                <textarea name="antecedentes_familiares" value={form.antecedentes_familiares} onChange={handleChange} />
              </label>
              <label className="clinical-grid-full">
                Antecedentes oculares
                <textarea name="antecedentes_oculares" value={form.antecedentes_oculares} onChange={handleChange} />
              </label>
            </div>
          </section>

          {/* Agudeza visual */}
          <section className="dashboard-card clinical-section">
            <h3>Agudeza visual</h3>
            <p className="clinical-subtitle">Sin corrección (AVSC)</p>
            <div className="eye-grid">
              <label>OD lejana <input name="avsc_od_lejana" value={form.avsc_od_lejana} onChange={handleChange} placeholder="20/20" /></label>
              <label>OI lejana <input name="avsc_oi_lejana" value={form.avsc_oi_lejana} onChange={handleChange} placeholder="20/20" /></label>
              <label>OD cercana <input name="avsc_od_cercana" value={form.avsc_od_cercana} onChange={handleChange} placeholder="20/20" /></label>
              <label>OI cercana <input name="avsc_oi_cercana" value={form.avsc_oi_cercana} onChange={handleChange} placeholder="20/20" /></label>
            </div>
            <p className="clinical-subtitle">Con corrección (AVCC)</p>
            <div className="eye-grid">
              <label>OD lejana <input name="avcc_od_lejana" value={form.avcc_od_lejana} onChange={handleChange} placeholder="20/20" /></label>
              <label>OI lejana <input name="avcc_oi_lejana" value={form.avcc_oi_lejana} onChange={handleChange} placeholder="20/20" /></label>
              <label>OD cercana <input name="avcc_od_cercana" value={form.avcc_od_cercana} onChange={handleChange} placeholder="20/20" /></label>
              <label>OI cercana <input name="avcc_oi_cercana" value={form.avcc_oi_cercana} onChange={handleChange} placeholder="20/20" /></label>
            </div>
          </section>

          {/* Lensometria */}
          <section className="dashboard-card clinical-section">
            <h3>Lensometría (lentes actuales del paciente)</h3>
            <div className="eye-grid eye-grid-3">
              <label>OD esfera <input type="number" step="0.25" name="lens_od_esfera" value={form.lens_od_esfera} onChange={handleChange} /></label>
              <label>OD cilindro <input type="number" step="0.25" name="lens_od_cilindro" value={form.lens_od_cilindro} onChange={handleChange} /></label>
              <label>OD eje <input type="number" name="lens_od_eje" value={form.lens_od_eje} onChange={handleChange} /></label>
              <label>OI esfera <input type="number" step="0.25" name="lens_oi_esfera" value={form.lens_oi_esfera} onChange={handleChange} /></label>
              <label>OI cilindro <input type="number" step="0.25" name="lens_oi_cilindro" value={form.lens_oi_cilindro} onChange={handleChange} /></label>
              <label>OI eje <input type="number" name="lens_oi_eje" value={form.lens_oi_eje} onChange={handleChange} /></label>
            </div>
          </section>

          {/* Examen fisico */}
          <section className="dashboard-card clinical-section">
            <h3>Examen externo y motor</h3>
            <div className="form-grid">
              <label className="clinical-grid-full">
                Examen externo
                <textarea name="examen_externo" value={form.examen_externo} onChange={handleChange} />
              </label>
              <label>Reflejo pupilar OD <input name="reflejo_od" value={form.reflejo_od} onChange={handleChange} /></label>
              <label>Reflejo pupilar OI <input name="reflejo_oi" value={form.reflejo_oi} onChange={handleChange} /></label>
              <label className="clinical-grid-full">
                Oftalmoscopía OD
                <textarea name="oftalmoscopia_od" value={form.oftalmoscopia_od} onChange={handleChange} />
              </label>
              <label className="clinical-grid-full">
                Oftalmoscopía OI
                <textarea name="oftalmoscopia_oi" value={form.oftalmoscopia_oi} onChange={handleChange} />
              </label>
              <label className="clinical-grid-full">
                Examen motor
                <textarea name="examen_motor" value={form.examen_motor} onChange={handleChange} />
              </label>
            </div>
          </section>

          {/* Refraccion / receta */}
          <section className="dashboard-card clinical-section">
            <h3>Refracción / fórmula óptica (receta)</h3>
            <div className="eye-grid eye-grid-4">
              <label>OD esfera <input type="number" step="0.25" name="rx_od_esfera" value={form.rx_od_esfera} onChange={handleChange} /></label>
              <label>OD cilindro <input type="number" step="0.25" name="rx_od_cilindro" value={form.rx_od_cilindro} onChange={handleChange} /></label>
              <label>OD eje <input type="number" name="rx_od_eje" value={form.rx_od_eje} onChange={handleChange} /></label>
              <label>OD adición <input type="number" step="0.25" name="rx_od_adicion" value={form.rx_od_adicion} onChange={handleChange} /></label>
              <label>OI esfera <input type="number" step="0.25" name="rx_oi_esfera" value={form.rx_oi_esfera} onChange={handleChange} /></label>
              <label>OI cilindro <input type="number" step="0.25" name="rx_oi_cilindro" value={form.rx_oi_cilindro} onChange={handleChange} /></label>
              <label>OI eje <input type="number" name="rx_oi_eje" value={form.rx_oi_eje} onChange={handleChange} /></label>
              <label>OI adición <input type="number" step="0.25" name="rx_oi_adicion" value={form.rx_oi_adicion} onChange={handleChange} /></label>
            </div>
            <div className="form-grid">
              <label>Distancia pupilar (mm) <input type="number" step="0.5" name="distancia_pupilar" value={form.distancia_pupilar} onChange={handleChange} /></label>
              <label className="clinical-grid-full">
                Indicaciones de la receta
                <textarea name="indicaciones_receta" value={form.indicaciones_receta} onChange={handleChange} maxLength="500" />
              </label>
            </div>
          </section>

          {/* Diagnostico y tratamiento */}
          <section className="dashboard-card clinical-section">
            <h3>Diagnóstico y tratamiento</h3>
            <div className="form-grid">
              <label>Código CIE-10 <input name="codigo_cie10" value={form.codigo_cie10} onChange={handleChange} maxLength="10" /></label>
              <label>Tipo de diagnóstico
                <select name="tipo_diagnostico" value={form.tipo_diagnostico} onChange={handleChange}>
                  <option value="Presuntivo">Presuntivo</option>
                  <option value="Definitivo">Definitivo</option>
                </select>
              </label>
              <label className="clinical-grid-full">Descripción CIE-10 <input name="descripcion_cie10" value={form.descripcion_cie10} onChange={handleChange} maxLength="300" /></label>
              <label className="clinical-grid-full">
                Observaciones del diagnóstico
                <textarea name="observaciones_dx" value={form.observaciones_dx} onChange={handleChange} />
              </label>
              <label className="clinical-grid-full">
                Tratamiento / recomendaciones
                <textarea name="tratamiento" value={form.tratamiento} onChange={handleChange} />
              </label>
            </div>
          </section>
        </fieldset>

        {!soloLectura && (
          <div className="clinical-actions">
            <button type="submit" className="primary-button" disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Actualizar consulta' : 'Guardar consulta'}
            </button>
            {editando && (
              <button type="button" className="ghost-button" onClick={finalizar} disabled={guardando}>
                Finalizar y bloquear
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
};