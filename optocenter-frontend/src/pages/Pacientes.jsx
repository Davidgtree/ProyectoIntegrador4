import { useEffect, useMemo, useState } from 'react';
import './Pacientes.css';

const API_URL = 'http://localhost:3000/api/pacientes';

const initialForm = {
  paciente_id: null,
  numero_identidad: '',
  nombres: '',
  apellidos: '',
  fecha_nacimiento: '',
  genero: 'M',
  direccion: '',
  telefono: '',
  correo: '',
  contacto_emergencia_nombre: '',
  contacto_emergencia_telefono: '',
};

export const Pacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const editando = useMemo(() => Boolean(form.paciente_id), [form.paciente_id]);

  const getToken = () => localStorage.getItem('token');

  const cargarPacientes = async (buscar = '') => {
    setCargando(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (buscar.trim()) params.set('buscar', buscar.trim());

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron consultar los pacientes');
      }

      setPacientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPacientes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((actual) => ({ ...actual, [name]: value }));
  };

  const limpiarFormulario = () => {
    setForm(initialForm);
    setMensaje('');
    setError('');
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    cargarPacientes(busqueda);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');
    setError('');

    try {
      const url = editando ? `${API_URL}/${form.paciente_id}` : API_URL;
      const method = editando ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar el paciente');
      }

      setMensaje(data.message);
      setForm(initialForm);
      await cargarPacientes(busqueda);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const editarPaciente = (paciente) => {
    setMensaje('');
    setError('');
    setForm({
      paciente_id: paciente.paciente_id,
      numero_identidad: paciente.numero_identidad || '',
      nombres: paciente.nombres || '',
      apellidos: paciente.apellidos || '',
      fecha_nacimiento: paciente.fecha_nacimiento
        ? String(paciente.fecha_nacimiento).slice(0, 10)
        : '',
      genero: paciente.genero || 'M',
      direccion: paciente.direccion || '',
      telefono: paciente.telefono || '',
      correo: paciente.correo || '',
      contacto_emergencia_nombre: paciente.contacto_emergencia_nombre || '',
      contacto_emergencia_telefono: paciente.contacto_emergencia_telefono || '',
    });
  };

  return (
    <div className="patients-page">
      <section className="patients-header">
        <div>
          <span className="section-label">Gestion de pacientes</span>
          <h2>Pacientes</h2>
          <p>Registra, consulta, busca y edita la informacion demografica de cada paciente.</p>
        </div>
      </section>

      <section className="patients-layout">
        <form className="patient-form dashboard-card" onSubmit={handleSubmit}>
          <div className="form-heading">
            <h3>{editando ? 'Editar paciente' : 'Nuevo paciente'}</h3>
            {editando && (
              <button type="button" className="ghost-button" onClick={limpiarFormulario}>
                Cancelar
              </button>
            )}
          </div>

          {(mensaje || error) && (
            <div className={error ? 'patient-alert patient-alert-error' : 'patient-alert'}>
              {error || mensaje}
            </div>
          )}

          <div className="form-grid">
            <label>
              Identificacion *
              <input
                name="numero_identidad"
                value={form.numero_identidad}
                onChange={handleChange}
                maxLength="20"
                required
              />
            </label>

            <label>
              Fecha nacimiento *
              <input
                type="date"
                name="fecha_nacimiento"
                value={form.fecha_nacimiento}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Nombres *
              <input name="nombres" value={form.nombres} onChange={handleChange} required />
            </label>

            <label>
              Apellidos *
              <input name="apellidos" value={form.apellidos} onChange={handleChange} required />
            </label>

            <label>
              Genero *
              <select name="genero" value={form.genero} onChange={handleChange} required>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </label>

            <label>
              Telefono
              <input name="telefono" value={form.telefono} onChange={handleChange} maxLength="20" />
            </label>

            <label>
              Correo
              <input type="email" name="correo" value={form.correo} onChange={handleChange} />
            </label>

            <label>
              Direccion
              <input name="direccion" value={form.direccion} onChange={handleChange} />
            </label>

            <label>
              Contacto emergencia
              <input
                name="contacto_emergencia_nombre"
                value={form.contacto_emergencia_nombre}
                onChange={handleChange}
              />
            </label>

            <label>
              Telefono emergencia
              <input
                name="contacto_emergencia_telefono"
                value={form.contacto_emergencia_telefono}
                onChange={handleChange}
                maxLength="20"
              />
            </label>
          </div>

          <button type="submit" className="primary-button" disabled={guardando}>
            {guardando ? 'Guardando...' : editando ? 'Actualizar paciente' : 'Registrar paciente'}
          </button>
        </form>

        <section className="patients-list dashboard-card">
          <form className="patients-search" onSubmit={handleBuscar}>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, identificacion, telefono o correo"
            />
            <button type="submit">Buscar</button>
          </form>

          <div className="patients-table-wrap">
            <table className="patients-table">
              <thead>
                <tr>
                  <th>Identificacion</th>
                  <th>Paciente</th>
                  <th>Edad</th>
                  <th>Telefono</th>
                  <th>Correo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan="6">Cargando pacientes...</td>
                  </tr>
                ) : pacientes.length === 0 ? (
                  <tr>
                    <td colSpan="6">No hay pacientes registrados.</td>
                  </tr>
                ) : (
                  pacientes.map((paciente) => (
                    <tr key={paciente.paciente_id}>
                      <td>{paciente.numero_identidad}</td>
                      <td>
                        <strong>{paciente.nombres} {paciente.apellidos}</strong>
                        <span>{paciente.genero === 'F' ? 'Femenino' : paciente.genero === 'M' ? 'Masculino' : 'Otro'}</span>
                      </td>
                      <td>{paciente.edad ?? '-'}</td>
                      <td>{paciente.telefono || '-'}</td>
                      <td>{paciente.correo || '-'}</td>
                      <td>
                        <button type="button" className="table-button" onClick={() => editarPaciente(paciente)}>
                          Editar
                        </button>
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
