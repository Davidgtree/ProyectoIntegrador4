import { useEffect, useMemo, useState } from 'react';
import './Inventario.css';

const API_PRODUCTOS = 'http://localhost:3000/api/productos';

const initialForm = {
  producto_id: null,
  categoria_id: '',
  proveedor_id: '',
  codigo_barras: '',
  sku: '',
  nombre: '',
  descripcion: '',
  precio_costo: '',
  precio_venta: '',
  stock_actual: '',
  stock_minimo: '',
  stock_maximo: '',
  unidad_medida: '',
  activo: true,
};

export const Inventario = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [modoEditar, setModoEditar] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [ajustandoStock, setAjustandoStock] = useState(false);

  const getToken = () => localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };

  const cargarOpciones = async () => {
    const response = await fetch(`${API_PRODUCTOS}/opciones`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'No se pudieron cargar opciones');
    setCategorias(data.categorias || []);
    setProveedores(data.proveedores || []);
  };

  const cargarProductos = async () => {
    setCargando(true);
    setError('');
    try {
      const response = await fetch(API_PRODUCTOS, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudieron cargar productos');
      setProductos(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarOpciones().catch((err) => setError(err.message));
    cargarProductos();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');
    setError('');

    try {
      const url = modoEditar ? `${API_PRODUCTOS}/${form.producto_id}` : API_PRODUCTOS;
      const method = modoEditar ? 'PUT' : 'POST';
      const payload = {
        ...form,
        categoria_id: form.categoria_id || null,
        proveedor_id: form.proveedor_id || null,
        precio_costo: Number(form.precio_costo),
        precio_venta: Number(form.precio_venta),
        stock_actual: Number(form.stock_actual),
        stock_minimo: form.stock_minimo ? Number(form.stock_minimo) : null,
        stock_maximo: form.stock_maximo ? Number(form.stock_maximo) : null,
      };

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo guardar el producto');
      setMensaje(data.message);
      limpiarFormulario();
      cargarProductos();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const editarProducto = (producto) => {
    setError('');
    setMensaje('');
    setModoEditar(true);
    setForm({
      producto_id: producto.producto_id,
      categoria_id: producto.categoria_id || '',
      proveedor_id: producto.proveedor_id || '',
      codigo_barras: producto.codigo_barras || '',
      sku: producto.sku || '',
      nombre: producto.nombre || '',
      descripcion: producto.descripcion || '',
      precio_costo: producto.precio_costo ?? '',
      precio_venta: producto.precio_venta ?? '',
      stock_actual: producto.stock_actual ?? '',
      stock_minimo: producto.stock_minimo ?? '',
      stock_maximo: producto.stock_maximo ?? '',
      unidad_medida: producto.unidad_medida || '',
      activo: Boolean(producto.activo),
    });
  };

  const ajustarStockProducto = async (e) => {
    if (!form.producto_id) return;
    setAjustandoStock(true);
    setMensaje('');
    setError('');

    try {
      const response = await fetch(`${API_PRODUCTOS}/${form.producto_id}/stock`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ stock_actual: Number(form.stock_actual), notas: 'Ajuste manual' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo ajustar el stock');
      setMensaje(data.message);
      cargarProductos();
    } catch (err) {
      setError(err.message);
    } finally {
      setAjustandoStock(false);
    }
  };

  const productoActivoTexto = useMemo(() => (form.activo ? 'Activo' : 'Inactivo'), [form.activo]);

  return (
    <div className="inventory-page">
      <section className="inventory-header">
        <div>
          <span className="section-label">Inventario</span>
          <h2>Gestion de productos</h2>
          <p>Administra productos, stock y precios desde un solo panel.</p>
        </div>
      </section>

      <section className="inventory-layout">
        <form className="inventory-form dashboard-card" onSubmit={handleSubmit}>
          <div className="form-heading">
            <h3>{modoEditar ? 'Editar producto' : 'Agregar producto'}</h3>
            {modoEditar && (
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

          <div className="inventory-grid">
            <label>
              Nombre *
              <input name="nombre" value={form.nombre} onChange={handleChange} required />
            </label>

            <label>
              Categoria
              <select name="categoria_id" value={form.categoria_id} onChange={handleChange}>
                <option value="">Sin categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.categoria_id} value={categoria.categoria_id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Proveedor
              <select name="proveedor_id" value={form.proveedor_id} onChange={handleChange}>
                <option value="">Sin proveedor</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.proveedor_id} value={proveedor.proveedor_id}>
                    {proveedor.razon_social}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Codigo de barras
              <input name="codigo_barras" value={form.codigo_barras} onChange={handleChange} />
            </label>

            <label>
              SKU
              <input name="sku" value={form.sku} onChange={handleChange} />
            </label>

            <label>
              Precio costo *
              <input type="number" step="0.01" name="precio_costo" value={form.precio_costo} onChange={handleChange} required />
            </label>

            <label>
              Precio venta *
              <input type="number" step="0.01" name="precio_venta" value={form.precio_venta} onChange={handleChange} required />
            </label>

            <label>
              Stock actual *
              <input type="number" step="0.01" name="stock_actual" value={form.stock_actual} onChange={handleChange} required />
            </label>

            <label>
              Stock minimo
              <input type="number" step="0.01" name="stock_minimo" value={form.stock_minimo} onChange={handleChange} />
            </label>

            <label>
              Stock maximo
              <input type="number" step="0.01" name="stock_maximo" value={form.stock_maximo} onChange={handleChange} />
            </label>

            <label>
              Unidad de medida *
              <input name="unidad_medida" value={form.unidad_medida} onChange={handleChange} required />
            </label>

            <label>
              Activo
              <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} />
              <small>{productoActivoTexto}</small>
            </label>

            <label className="full-width">
              Descripcion
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows="3" />
            </label>
          </div>

          <div className="inventory-actions">
            <button type="submit" className="primary-button" disabled={guardando}>
              {modoEditar ? 'Guardar cambios' : 'Agregar producto'}
            </button>
            {modoEditar && (
              <button type="button" className="primary-button secondary" disabled={ajustandoStock} onClick={ajustarStockProducto}>
                Ajustar stock
              </button>
            )}
          </div>
        </form>

        <section className="inventory-list dashboard-card">
          <div className="form-heading">
            <h3>Lista de productos</h3>
          </div>

          {cargando ? (
            <p>Cargando productos...</p>
          ) : (
            <div className="inventory-table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Categoria</th>
                    <th>Proveedor</th>
                    <th>Stock</th>
                    <th>Precio venta</th>
                    <th>Activo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((producto) => (
                    <tr key={producto.producto_id}>
                      <td>{producto.nombre}</td>
                      <td>{producto.categoria_nombre || '-'}</td>
                      <td>{producto.proveedor_nombre || '-'}</td>
                      <td>{producto.stock_actual}</td>
                      <td>{producto.precio_venta}</td>
                      <td>{producto.activo ? 'Si' : 'No'}</td>
                      <td>
                        <button type="button" className="table-button" onClick={() => editarProducto(producto)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </div>
  );
};
