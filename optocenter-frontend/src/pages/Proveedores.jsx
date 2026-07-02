import { useEffect, useState } from 'react';
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
  const [form, setForm] = useState(initialForm);
  const [modoEditar, setModoEditar] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const getToken = () => localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };

  const cargarProveedores = async () => {
    try {
      const response = await fetch(API_PROVEEDORES, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudieron cargar proveedores');
      setProveedores(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  const limpiarFormulario = () => {
    setForm(initialForm);
    setModoEditar(false);
    setMensaje('');
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const guardarProveedor = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');
    setError('');

    try {
      const method = modoEditar ? 'PUT' : 'POST';
      const url = modoEditar ? `${API_PROVEEDORES}/${form.proveedor_id}` : API_PROVEEDORES;
      const payload = {
        ...form,
        plazo_dias_pago: form.plazo_dias_pago ? Number(form.plazo_dias_pago) : null,
      };

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo guardar el proveedor');

      setMensaje(data.message);
      limpiarFormulario();
      cargarProveedores();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const editarProveedor = (proveedor) => {
    setModoEditar(true);
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
    setMensaje('');
    setError('');
  };

  return (
    <div className="providers-page">
      <section className="section-header">
        <div>
          <span className="section-label">Proveedores</span>
          <h2>CRUD completo de proveedores</h2>
          <p>Agrega, edita y revisa la lista de proveedores registrados.</p>
        </div>
      </section>

      <section className="providers-grid">
        <form className="providers-form dashboard-card" onSubmit={guardarProveedor}>
          <div className="form-heading">
            <h3>{modoEditar ? 'Editar proveedor' : 'Agregar proveedor'}</h3>
            <button type="button" className="ghost-button" onClick={limpiarFormulario}>
              Limpiar
            </button>
          </div>

          {(mensaje || error) && (
            <div className={error ? 'appointment-alert appointment-alert-error' : 'appointment-alert'}>
              {error || mensaje}
            </div>
          )}

          <div className="providers-fields">
            <label>
              Razon social *
              <input name="razon_social" value={form.razon_social} onChange={handleChange} required />
            </label>
            <label>
              RIF/NIT
              <input name="rif_nit" value={form.rif_nit} onChange={handleChange} />
            </label>
            <label>
              Contacto
              <input name="contacto_nombre" value={form.contacto_nombre} onChange={handleChange} />
            </label>
            <label>
              Telefono *
              <input name="telefono" value={form.telefono} onChange={handleChange} required />
            </label>
            <label>
              Correo *
              <input type="email" name="correo" value={form.correo} onChange={handleChange} required />
            </label>
            <label>
              Direccion
              <input name="direccion" value={form.direccion} onChange={handleChange} />
            </label>
            <label>
              Condicion credito
              <input name="condicion_credito" value={form.condicion_credito} onChange={handleChange} />
            </label>
            <label>
              Plazo dias pago
              <input type="number" name="plazo_dias_pago" value={form.plazo_dias_pago} onChange={handleChange} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} />
              Activo
            </label>
          </div>

          <button type="submit" className="primary-button" disabled={guardando}>
            {modoEditar ? 'Guardar proveedor' : 'Crear proveedor'}
          </button>
        </form>

        <section className="providers-list dashboard-card">
          <div className="form-heading">
            <h3>Lista de proveedores</h3>
          </div>
          <div className="providers-table-wrap">
            <table className="providers-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Telefono</th>
                  <th>Correo</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((proveedor) => (
                  <tr key={proveedor.proveedor_id}>
                    <td>{proveedor.razon_social}</td>
                    <td>{proveedor.telefono}</td>
                    <td>{proveedor.correo}</td>
                    <td>{proveedor.activo ? 'Si' : 'No'}</td>
                    <td>
                      <button type="button" className="table-button" onClick={() => editarProveedor(proveedor)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
};
