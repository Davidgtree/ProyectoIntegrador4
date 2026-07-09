import { useCallback, useEffect, useRef, useState } from 'react';
import './Proveedores.css';

const API_PROVEEDORES = 'http://localhost:3000/api/proveedores';

const initialForm = {
  proveedor_id: null,
  razon_social: '',
  rif_nit: '',
  contacto_nombre: '',
  telefono: '',
  correo: '',
  direccion: '',
  condicion_credito: '',
  plazo_dias_pago: '',
  activo: true,
};

export const Proveedores = () => {
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(initialForm);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const cargarProveedores = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      const response = await fetch(API_PROVEEDORES, { headers: getHeaders() });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar los proveedores');
      }

      setProveedores(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los proveedores');
    } finally {
      setCargando(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    const fetchProveedores = async () => {
      await cargarProveedores();
    };

    void fetchProveedores();
    const root = document.querySelector('.proveedores-page, .providers-page');
    if (!root) {
      console.error('[Proveedores] no se encontró el nodo principal .proveedores-page / .providers-page');
      return;
    }

    const computed = window.getComputedStyle(root);
    const family = computed.fontFamily || '';
    const bg = computed.backgroundColor || '';
    const heading = root.querySelector('.proveedores-header h2, .providers-header h2');
    const headingFont = heading ? window.getComputedStyle(heading).fontFamily || '' : '';

    const hasInter = /inter/i.test(family);
    const hasFraunces = /fraunces/i.test(headingFont);
    const hasPaper = /rgb\(\s*246,\s*244,\s*239\s*\)|#f6f4ef/i.test(bg);

    if (!hasInter || !hasFraunces || !hasPaper) {
      console.warn('[Proveedores] diseño no aplicado correctamente:', {
        selector: root.className,
        rootFontFamily: family,
        headingFontFamily: headingFont || 'no encontrado',
        rootBackgroundColor: bg,
      });
    } else {
      console.log('[Proveedores] diseño aplicado correctamente', {
        rootFontFamily: family,
        headingFontFamily: headingFont,
        rootBackgroundColor: bg,
      });
    }
  }, [cargarProveedores]);

  const limpiarFormulario = () => {
    setForm(initialForm);
    setEditando(false);
    setMensaje('');
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const manejarGuardar = async (event) => {
    event.preventDefault();

    setGuardando(true);
    setMensaje('');
    setError('');

    const method = editando ? 'PUT' : 'POST';
    const url = editando ? `${API_PROVEEDORES}/${form.proveedor_id}` : API_PROVEEDORES;
    const payload = {
      razon_social: form.razon_social,
      rif_nit: form.rif_nit,
      contacto_nombre: form.contacto_nombre,
      telefono: form.telefono,
      correo: form.correo,
      direccion: form.direccion,
      condicion_credito: form.condicion_credito,
      plazo_dias_pago: form.plazo_dias_pago ? Number(form.plazo_dias_pago) : null,
      activo: form.activo,
    };

    try {
      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar el proveedor');
      }

      setMensaje(data.message || (editando ? 'Proveedor actualizado correctamente' : 'Proveedor creado correctamente'));
      limpiarFormulario();
      cargarProveedores();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el proveedor');
    } finally {
      setGuardando(false);
    }
  };

  const manejarEditar = (proveedor) => {
    setForm({
      proveedor_id: proveedor.proveedor_id,
      razon_social: proveedor.razon_social || '',
      rif_nit: proveedor.rif_nit || '',
      contacto_nombre: proveedor.contacto_nombre || '',
      telefono: proveedor.telefono || '',
      correo: proveedor.correo || '',
      direccion: proveedor.direccion || '',
      condicion_credito: proveedor.condicion_credito || '',
      plazo_dias_pago: proveedor.plazo_dias_pago ?? '',
      activo: Boolean(proveedor.activo),
    });
    setEditando(true);
    setMensaje('');
    setError('');
  };

  const manejarCambioEstado = async (proveedor) => {
    try {
      const response = await fetch(`${API_PROVEEDORES}/${proveedor.proveedor_id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ...proveedor, activo: !proveedor.activo }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo actualizar el estado');
      }

      cargarProveedores();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el estado');
    }
  };

  return (
    <div className="proveedores-page">
      <div className="proveedores-header">
        <div>
          <span className="section-label">Compras</span>
          <h2>Gestión de proveedores</h2>
          <p>Agrega, edita y controla el estado de los proveedores registrados.</p>
        </div>
      </div>

      <div className="proveedores-layout">
        <section className="proveedores-form-card dashboard-card">
          <div className="panel-heading">
            <div>
              <span className="section-label">Proveedor</span>
              <h3>{editando ? 'Editar proveedor' : 'Agregar proveedor'}</h3>
            </div>
          </div>
          {mensaje && <div className="dashboard-success">{mensaje}</div>}
          {error && <div className="dashboard-error">{error}</div>}
          <form className="proveedores-form" onSubmit={manejarGuardar}>
            <div className="proveedores-field-row">
              <div className="proveedores-field">
                <label>Razón social</label>
                <input name="razon_social" value={form.razon_social} onChange={handleChange} required />
              </div>
              <div className="proveedores-field">
                <label>RIF/NIT</label>
                <input name="rif_nit" value={form.rif_nit} onChange={handleChange} />
              </div>
            </div>
            <div className="proveedores-field-row">
              <div className="proveedores-field">
                <label>Contacto</label>
                <input name="contacto_nombre" value={form.contacto_nombre} onChange={handleChange} />
              </div>
              <div className="proveedores-field">
                <label>Teléfono</label>
                <input name="telefono" value={form.telefono} onChange={handleChange} required />
              </div>
            </div>
            <div className="proveedores-field-row">
              <div className="proveedores-field">
                <label>Correo</label>
                <input type="email" name="correo" value={form.correo} onChange={handleChange} required />
              </div>
              <div className="proveedores-field">
                <label>Dirección</label>
                <input name="direccion" value={form.direccion} onChange={handleChange} />
              </div>
            </div>
            <div className="proveedores-field-row">
              <div className="proveedores-field">
                <label>Condición de crédito</label>
                <input name="condicion_credito" value={form.condicion_credito} onChange={handleChange} />
              </div>
              <div className="proveedores-field">
                <label>Plazo días pago</label>
                <input type="number" name="plazo_dias_pago" value={form.plazo_dias_pago} onChange={handleChange} />
              </div>
            </div>
            <div className="proveedores-field proveedores-field-checkbox">
              <input type="checkbox" id="activo" name="activo" checked={form.activo} onChange={handleChange} />
              <label htmlFor="activo">Proveedor activo</label>
            </div>
            <div className="proveedores-form-actions">
              <button type="submit" className="dashboard-action" disabled={guardando}>
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear proveedor'}
              </button>
              {editando && (
                <button type="button" className="dashboard-secondary" onClick={limpiarFormulario}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="proveedores-list-card dashboard-card">
          <div className="panel-heading">
            <div>
              <span className="section-label">Proveedores</span>
              <h3>Proveedores registrados</h3>
            </div>
          </div>
          {cargando ? (
            <p>Cargando proveedores...</p>
          ) : proveedores.length === 0 ? (
            <p>No hay proveedores registrados.</p>
          ) : (
            <div className="proveedores-table">
              {proveedores.map((proveedor) => (
                <div className="proveedor-row" key={proveedor.proveedor_id}>
                  <div className="proveedor-info">
                    <strong>{proveedor.razon_social}</strong>
                    <span>{proveedor.correo}</span>
                    <span>{proveedor.telefono}</span>
                    <small className={proveedor.activo ? '' : 'inactivo'}>
                      {proveedor.activo ? 'Activo' : 'Inactivo'}
                    </small>
                  </div>
                  <div className="proveedor-actions">
                    <button type="button" className="table-button" onClick={() => manejarEditar(proveedor)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className={`table-button ${proveedor.activo ? '' : 'activar'}`}
                      onClick={() => manejarCambioEstado(proveedor)}
                    >
                      {proveedor.activo ? 'Inactivar' : 'Activar'}
                    </button>
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