import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Usuarios.css';

const API_AUTH = 'http://localhost:3000/api/auth';

const ROLE_LABELS = {
  1: 'Administrador',
  2: 'Optómetra',
  3: 'Cajero',
  4: 'Recepcion',
};

const ROLES = [
  { id: 2, nombre: 'Optómetra' },
  { id: 3, nombre: 'Cajero' },
  { id: 4, nombre: 'Recepcion' },
];

const initialForm = {
  empleado_id: null,
  nombres: '',
  apellidos: '',
  numero_identidad: '',
  correo: '',
  telefono: '',
  rol_id: 2,
};

export const Usuarios = () => {
  const { user, token } = useAuth();
  const roleId = Number(user?.rol_id);
  const isAdmin = roleId === 1;

  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(initialForm);

  const getHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  const cargarUsuarios = useCallback(async () => {
    if (!isAdmin) return;

    setCargando(true);
    setError('');

    try {
      const response = await fetch(`${API_AUTH}/usuarios`, {
        headers: getHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar los usuarios');
      }

      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los usuarios');
    } finally {
      setCargando(false);
    }
  }, [getHeaders, isAdmin]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      await cargarUsuarios();
    };

    void fetchUsuarios();
  }, [cargarUsuarios]);

  const limpiarFormulario = () => {
    setForm(initialForm);
    setEditando(false);
    setMensaje('');
    setError('');
  };

  const manejarGuardar = async (event) => {
    event.preventDefault();
    if (!isAdmin) return;

    setGuardando(true);
    setMensaje('');
    setError('');

    const method = editando ? 'PUT' : 'POST';
    const url = editando ? `${API_AUTH}/usuarios/${form.empleado_id}` : `${API_AUTH}/usuarios`;
    const payload = {
      nombres: form.nombres,
      apellidos: form.apellidos,
      numero_identidad: form.numero_identidad,
      correo: form.correo,
      telefono: form.telefono,
      rol_id: Number(form.rol_id),
    };

    try {
      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar el usuario');
      }

      setMensaje(editando ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      limpiarFormulario();
      cargarUsuarios();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el usuario');
    } finally {
      setGuardando(false);
    }
  };

  const manejarEditar = (usuario) => {
    setForm({
      empleado_id: usuario.empleado_id,
      nombres: usuario.nombres || '',
      apellidos: usuario.apellidos || '',
      numero_identidad: usuario.numero_identidad || '',
      correo: usuario.correo || '',
      telefono: usuario.telefono || '',
      rol_id: usuario.rol_id || 2,
    });
    setEditando(true);
    setMensaje('');
    setError('');
  };

  const manejarCambioEstado = async (empleadoId, activo) => {
    if (!isAdmin) return;

    try {
      const response = await fetch(`${API_AUTH}/usuarios/${empleadoId}/estado`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ activo }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo actualizar el estado');
      }

      cargarUsuarios();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el estado');
    }
  };

  const manejarDesbloquear = async (empleadoId) => {
    if (!isAdmin) return;

    try {
      const response = await fetch(`${API_AUTH}/usuarios/${empleadoId}/desbloquear`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo desbloquear el usuario');
      }

      cargarUsuarios();
    } catch (err) {
      setError(err.message || 'No se pudo desbloquear el usuario');
    }
  };

  if (!isAdmin) {
    return <div className="usuarios-page"><p>No tienes permiso para acceder a esta página.</p></div>;
  }

  return (
    <div className="usuarios-page">
      <div className="usuarios-header">
        <div>
          <span className="section-label">Administración</span>
          <h2>Gestión de usuarios</h2>
          <p>Administra empleados, edita perfiles y controla accesos.</p>
        </div>
      </div>

      <div className="usuarios-layout">
        <section className="usuarios-form-card dashboard-card">
          <div className="panel-heading">
            <div>
              <span className="section-label">Usuario</span>
              <h3>{editando ? 'Editar usuario' : 'Crear usuario'}</h3>
            </div>
          </div>
          {mensaje && <div className="dashboard-success">{mensaje}</div>}
          {error && <div className="dashboard-error">{error}</div>}
          <form className="usuarios-form" onSubmit={manejarGuardar}>
            <div className="usuarios-field-row">
              <div className="usuarios-field">
                <label>Nombres</label>
                <input
                  name="nombres"
                  value={form.nombres}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombres: e.target.value }))}
                  required
                />
              </div>
              <div className="usuarios-field">
                <label>Apellidos</label>
                <input
                  name="apellidos"
                  value={form.apellidos}
                  onChange={(e) => setForm((prev) => ({ ...prev, apellidos: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="usuarios-field-row">
              <div className="usuarios-field">
                <label>Número de identidad</label>
                <input
                  name="numero_identidad"
                  value={form.numero_identidad}
                  onChange={(e) => setForm((prev) => ({ ...prev, numero_identidad: e.target.value }))}
                  required
                />
              </div>
              <div className="usuarios-field">
                <label>Correo</label>
                <input
                  type="email"
                  name="correo"
                  value={form.correo}
                  onChange={(e) => setForm((prev) => ({ ...prev, correo: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="usuarios-field-row">
              <div className="usuarios-field">
                <label>Teléfono</label>
                <input
                  name="telefono"
                  value={form.telefono}
                  onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
                />
              </div>
              <div className="usuarios-field">
                <label>Rol</label>
                <select
                  name="rol_id"
                  value={form.rol_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, rol_id: Number(e.target.value) }))}
                >
                  {ROLES.map((rol) => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="usuarios-form-actions">
              <button type="submit" className="dashboard-action" disabled={guardando}>
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear usuario'}
              </button>
              {editando && (
                <button type="button" className="dashboard-secondary" onClick={limpiarFormulario}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="usuarios-list-card dashboard-card">
          <div className="panel-heading">
            <div>
              <span className="section-label">Usuarios</span>
              <h3>Usuarios del sistema</h3>
            </div>
          </div>
          {cargando ? (
            <p>Cargando usuarios...</p>
          ) : usuarios.length === 0 ? (
            <p>No hay usuarios registrados.</p>
          ) : (
            <div className="usuarios-table">
              {usuarios.map((usuario) => (
                <div className="usuario-row" key={usuario.empleado_id}>
                  <div className="usuario-info">
                    <strong>{usuario.nombres} {usuario.apellidos}</strong>
                    <span>{usuario.correo}</span>
                    <span>{usuario.numero_identidad}</span>
                    <small>{ROLE_LABELS[usuario.rol_id] || 'Usuario'}</small>
                  </div>
                  <div className="usuario-actions">
                    <button type="button" className="table-button" onClick={() => manejarEditar(usuario)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="table-button"
                      onClick={() => manejarCambioEstado(usuario.empleado_id, !usuario.activo)}
                    >
                      {usuario.activo ? 'Inactivar' : 'Activar'}
                    </button>
                    {usuario.bloqueado && (
                      <button type="button" className="table-button desbloquear" onClick={() => manejarDesbloquear(usuario.empleado_id)}>
                        Desbloquear
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
