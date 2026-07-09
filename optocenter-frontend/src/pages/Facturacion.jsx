import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBillingAccessPolicy } from '../utils/permissions';
import './Facturacion.css';

const API_BILLING = 'http://localhost:3000/api/facturacion';
const API_PACIENTES = 'http://localhost:3000/api/pacientes';
const API_PRODUCTOS = 'http://localhost:3000/api/productos';

const initialVentaForm = {
  paciente_id: '',
  impuestos: '0.00',
  motivo_descuento: '',
  forma_pago: 'Efectivo',
};

const initialItem = {
  producto_id: '',
  cantidad: '1',
  precio_unitario: '0.00',
  descuento_pct: '0',
};

const initialInvoiceForm = {
  tipo_documento: 'Factura',
  tipo_emision: 'Electronica',
  cliente_nombre: '',
  cliente_identidad: '',
  cliente_correo: '',
  motivo: '',
};

const initialPaymentForm = {
  forma_pago: 'Efectivo',
  monto: '0.00',
  referencia: '',
  banco: '',
};

export const Facturacion = () => {
  const { user, token } = useAuth();
  const [ventas, setVentas] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ventaForm, setVentaForm] = useState(initialVentaForm);
  const [items, setItems] = useState([initialItem]);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [ventaDetalles, setVentaDetalles] = useState([]);
  const [ventaPagos, setVentaPagos] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState(initialInvoiceForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const policy = useMemo(() => getBillingAccessPolicy(user?.rol_id), [user?.rol_id]);

  const getHeaders = () => {
    const actualToken = token || localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (actualToken) {
      headers.Authorization = `Bearer ${actualToken}`;
    }
    return headers;
  };

  const cargarVentas = async () => {
    setLoading(true);
    setError('');
    const actualToken = token || localStorage.getItem('token');
    if (!actualToken) {
      setError('Token de autenticación no disponible. Vuelva a ingresar.');
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BILLING}/ventas`, { headers: getHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudieron cargar las ventas');
      setVentas(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarFacturas = async () => {
    try {
      const response = await fetch(`${API_BILLING}/facturas`, { headers: getHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudieron cargar las facturas');
      setFacturas(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const cargarPacientes = async () => {
    try {
      const response = await fetch(API_PACIENTES, { headers: getHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudieron cargar los pacientes');
      setPacientes(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const cargarProductos = async () => {
    try {
      const response = await fetch(API_PRODUCTOS, { headers: getHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudieron cargar los productos');
      setProductos(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    cargarPacientes();
    cargarProductos();
    cargarVentas();
    cargarFacturas();
  }, []);

  const cargarVentaDetalle = async (ventaId) => {
    if (!ventaId) return;

    try {
      const response = await fetch(`${API_BILLING}/ventas/${ventaId}`, { headers: getHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudieron cargar los detalles de la venta');
      setSelectedVenta(data);
      setVentaDetalles(data.detalles || []);
      setVentaPagos(data.pagos || []);
      setInvoiceForm((prev) => ({
        ...prev,
        cliente_nombre: data.cliente_nombre || '',
        cliente_identidad: data.cliente_identidad || '',
        cliente_correo: data.cliente_correo || '',
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  const totalSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.cantidad || 0) * Number(item.precio_unitario || 0), 0),
    [items]
  );

  const totalDescuento = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.cantidad || 0) * Number(item.precio_unitario || 0) * (Number(item.descuento_pct || 0) / 100), 0),
    [items]
  );

  const impuestos = useMemo(() => Number(ventaForm.impuestos || 0), [ventaForm.impuestos]);
  const totalVenta = useMemo(() => totalSubtotal - totalDescuento + impuestos, [totalSubtotal, totalDescuento, impuestos]);

  const handleVentaChange = (e) => {
    const { name, value } = e.target;
    setVentaForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [name]: value };
      return next;
    });
  };

  const agregarItem = () => {
    setItems((prev) => [...prev, initialItem]);
  };

  const eliminarItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleProductoSeleccionado = (index, productId) => {
    const producto = productos.find((item) => String(item.producto_id) === String(productId));
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        producto_id: productId,
        precio_unitario: producto ? String(producto.precio_venta ?? '0.00') : next[index].precio_unitario,
      };
      return next;
    });
  };

  const crearVenta = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    try {
      const payload = {
        paciente_id: ventaForm.paciente_id ? Number(ventaForm.paciente_id) : null,
        impuestos: Number(ventaForm.impuestos || 0),
        motivo_descuento: ventaForm.motivo_descuento || null,
        forma_pago: ventaForm.forma_pago || null,
        monto: Number(totalVenta.toFixed(2)),
        items: items.map((item) => ({
          producto_id: Number(item.producto_id),
          cantidad: Number(item.cantidad),
          precio_unitario: Number(item.precio_unitario),
          descuento_pct: Number(item.descuento_pct),
        })),
      };

      const response = await fetch(`${API_BILLING}/ventas`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo crear la venta');

      setMensaje(data.message);
      setVentaForm(initialVentaForm);
      setItems([initialItem]);
      await cargarVentas();
      if (data.venta_id) cargarVentaDetalle(data.venta_id);
    } catch (err) {
      setError(err.message);
    }
  };

  const seleccionarVenta = (venta) => {
    setMensaje('');
    setError('');
    cargarVentaDetalle(venta.venta_id);
  };

  const confirmarVenta = async (ventaId) => {
    if (!window.confirm('Confirmar esta venta?')) return;
    setError('');
    setMensaje('');
    try {
      const response = await fetch(`${API_BILLING}/ventas/${ventaId}/confirmar`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo confirmar la venta');
      setMensaje(data.message);
      await cargarVentas();
      cargarVentaDetalle(ventaId);
    } catch (err) {
      setError(err.message);
    }
  };

  const anularVenta = async () => {
    if (!selectedVenta) return;
    const motivo = window.prompt('Motivo de anulacion:', 'Venta cancelada');
    if (!motivo) return;
    setError('');
    setMensaje('');

    try {
      const response = await fetch(`${API_BILLING}/ventas/${selectedVenta.venta_id}/anular`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ motivo }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo anular la venta');
      setMensaje(data.message);
      await cargarVentas();
      cargarVentaDetalle(selectedVenta.venta_id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInvoiceChange = (e) => {
    const { name, value } = e.target;
    setInvoiceForm((prev) => ({ ...prev, [name]: value }));
  };

  const crearFactura = async (e) => {
    e.preventDefault();
    if (!selectedVenta) {
      setError('Seleccione una venta para emitir la factura.');
      return;
    }
    setError('');
    setMensaje('');

    try {
      const payload = {
        venta_id: selectedVenta.venta_id,
        tipo_documento: invoiceForm.tipo_documento,
        tipo_emision: invoiceForm.tipo_emision,
        cliente_nombre: invoiceForm.cliente_nombre,
        cliente_identidad: invoiceForm.cliente_identidad,
        cliente_correo: invoiceForm.cliente_correo,
        motivo: invoiceForm.motivo || null,
      };
      const response = await fetch(`${API_BILLING}/facturas`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo crear la factura');
      setMensaje(data.message);
      await cargarFacturas();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  const registrarPago = async (e) => {
    e.preventDefault();
    if (!selectedVenta) {
      setError('Seleccione una venta para registrar el pago.');
      return;
    }
    setError('');
    setMensaje('');

    try {
      const payload = {
        forma_pago: paymentForm.forma_pago,
        monto: Number(paymentForm.monto),
        referencia: paymentForm.referencia || null,
        banco: paymentForm.banco || null,
      };
      const response = await fetch(`${API_BILLING}/ventas/${selectedVenta.venta_id}/pagos`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo registrar el pago');
      setMensaje(data.message);
      setPaymentForm(initialPaymentForm);
      cargarVentaDetalle(selectedVenta.venta_id);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="billing-page">
      <section className="section-header">
        <div>
          <span className="section-label">Facturación</span>
          <h2>Ventas, facturas y pagos</h2>
          <p>Administra el ciclo de cobro desde la venta hasta la emisión de facturas y pagos.</p>
        </div>
      </section>

      {(mensaje || error) && (
        <div className={error ? 'appointment-alert appointment-alert-error' : 'appointment-alert'}>
          {error || mensaje}
        </div>
      )}

      <section className="billing-grid">
        {policy.canCreateSale ? (
          <article className="billing-card">
            <div className="form-heading">
              <h3>Crear nueva venta</h3>
            </div>
            <form className="billing-form" onSubmit={crearVenta}>
            <div className="billing-row">
              <label>
                Paciente (opcional)
                <select name="paciente_id" value={ventaForm.paciente_id} onChange={handleVentaChange}>
                  <option value="">Sin paciente asignado</option>
                  {pacientes.map((paciente) => (
                    <option key={paciente.paciente_id} value={paciente.paciente_id}>
                      {paciente.nombres} {paciente.apellidos} - {paciente.numero_identidad}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="billing-items">
              <div className="form-heading">
                <h4>Artículos</h4>
                <button type="button" className="secondary-button" onClick={agregarItem}>
                  Agregar línea
                </button>
              </div>
              {items.map((item, index) => (
                <div key={index} className="billing-item-row">
                  <label>
                    Producto
                    <select
                      name="producto_id"
                      value={item.producto_id}
                      onChange={(e) => handleProductoSeleccionado(index, e.target.value)}
                      required
                    >
                      <option value="">Seleccionar producto</option>
                      {productos.map((producto) => (
                        <option key={producto.producto_id} value={producto.producto_id}>
                          {producto.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Cantidad
                    <input
                      type="number"
                      name="cantidad"
                      min="1"
                      step="1"
                      value={item.cantidad}
                      onChange={(e) => handleItemChange(index, e)}
                      required
                    />
                  </label>
                  <label>
                    Precio
                    <input
                      type="number"
                      name="precio_unitario"
                      step="0.01"
                      value={item.precio_unitario}
                      onChange={(e) => handleItemChange(index, e)}
                      required
                    />
                  </label>
                  <label>
                    Descuento %
                    <input
                      type="number"
                      name="descuento_pct"
                      min="0"
                      max="100"
                      step="0.1"
                      value={item.descuento_pct}
                      onChange={(e) => handleItemChange(index, e)}
                    />
                  </label>
                  <label>
                    Subtotal
                    <input
                      type="text"
                      readOnly
                      value={
                        ((Number(item.cantidad || 0) * Number(item.precio_unitario || 0)) *
                          (1 - Number(item.descuento_pct || 0) / 100)).toFixed(2)
                      }
                    />
                  </label>
                  <button type="button" className="table-button" onClick={() => eliminarItem(index)}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>

            <div className="billing-summary">
              <div>
                <strong>Subtotal:</strong> {totalSubtotal.toFixed(2)}
              </div>
              <div>
                <strong>Descuento:</strong> {totalDescuento.toFixed(2)}
              </div>
              <div>
                <label>
                  Impuestos
                  <input
                    type="number"
                    name="impuestos"
                    step="0.01"
                    value={ventaForm.impuestos}
                    onChange={handleVentaChange}
                  />
                </label>
              </div>
              <div>
                <strong>Total:</strong> {totalVenta.toFixed(2)}
              </div>
            </div>

            <div className="billing-row">
              <label>
                Método de pago
                <select name="forma_pago" value={ventaForm.forma_pago} onChange={handleVentaChange}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </label>
            </div>

            <label className="full-width">
              Motivo de descuento
              <input name="motivo_descuento" value={ventaForm.motivo_descuento} onChange={handleVentaChange} />
            </label>

            <button type="submit" className="primary-button">
              Crear venta
            </button>
            </form>
          </article>
        ) : null}

        <article className="billing-card">
          <div className="form-heading">
            <h3>Ventas registradas</h3>
          </div>
          {!policy.canCreateSale && (
            <div className="patient-alert">
              Vista solo lectura: el administrador puede revisar ventas, detalle y facturas emitidas.
            </div>
          )}
          {loading ? (
            <p>Cargando ventas...</p>
          ) : (
            <div className="billing-table-wrap">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Venta</th>
                    <th>Paciente</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((venta) => (
                    <tr key={venta.venta_id}>
                      <td>{venta.numero_venta}</td>
                      <td>{venta.cliente_nombre || '-'}</td>
                      <td>{venta.estado}</td>
                      <td>{venta.total?.toFixed(2) ?? '-'}</td>
                      <td className="billing-actions-cell">
                        <button type="button" className="table-button" onClick={() => seleccionarVenta(venta)}>
                          Ver
                        </button>
                        {policy.canConfirmSale ? (
                          <button type="button" className="table-button" onClick={() => confirmarVenta(venta.venta_id)}>
                            Confirmar
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="billing-card billing-detail-card">
          <div className="form-heading">
            <h3>Detalle de venta</h3>
          </div>
          {selectedVenta ? (
            <div className="billing-detail">
              <div className="billing-detail-row">
                <span>Pedido:</span>
                <strong>{selectedVenta.numero_venta}</strong>
              </div>
              <div className="billing-detail-row">
                <span>Cliente:</span>
                <strong>{selectedVenta.cliente_nombre || '-'}</strong>
              </div>
              <div className="billing-detail-row">
                <span>Estado:</span>
                <strong>{selectedVenta.estado}</strong>
              </div>
              <div className="billing-detail-row">
                <span>Total:</span>
                <strong>{selectedVenta.total?.toFixed(2) ?? '-'}</strong>
              </div>
              {policy.canVoidSale ? (
                <div className="billing-detail-actions">
                  <button type="button" className="table-button" onClick={anularVenta}>
                    Anular venta
                  </button>
                </div>
              ) : null}

              <div className="billing-subsection">
                <h4>Artículos</h4>
                <table className="billing-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>Desc %</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventaDetalles.map((detalle) => (
                      <tr key={detalle.detalle_venta_id}>
                        <td>{detalle.producto_nombre || detalle.producto_id}</td>
                        <td>{detalle.cantidad}</td>
                        <td>{detalle.precio_unitario}</td>
                        <td>{detalle.descuento_pct}</td>
                        <td>{detalle.subtotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="billing-subsection">
                <h4>Pagos</h4>
                <table className="billing-table">
                  <thead>
                    <tr>
                      <th>Forma</th>
                      <th>Monto</th>
                      <th>Banco</th>
                      <th>Referencia</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventaPagos.map((pago) => (
                      <tr key={pago.pago_id}>
                        <td>{pago.forma_pago}</td>
                        <td>{pago.monto}</td>
                        <td>{pago.banco || '-'}</td>
                        <td>{pago.referencia || '-'}</td>
                        <td>{pago.fecha_hora ? new Date(pago.fecha_hora).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {policy.canManagePayments ? (
                  <form className="billing-form" onSubmit={registrarPago}>
                    <div className="billing-row">
                      <label>
                        Forma de pago
                        <select name="forma_pago" value={paymentForm.forma_pago} onChange={handlePaymentChange}>
                          <option value="Efectivo">Efectivo</option>
                          <option value="Tarjeta">Tarjeta</option>
                          <option value="Transferencia">Transferencia</option>
                        </select>
                      </label>
                      <label>
                        Monto
                        <input type="number" step="0.01" name="monto" value={paymentForm.monto} onChange={handlePaymentChange} required />
                      </label>
                      <label>
                        Referencia
                        <input name="referencia" value={paymentForm.referencia} onChange={handlePaymentChange} />
                      </label>
                      <label>
                        Banco
                        <input name="banco" value={paymentForm.banco} onChange={handlePaymentChange} />
                      </label>
                    </div>
                    <button type="submit" className="primary-button">
                      Registrar pago
                    </button>
                  </form>
                ) : null}
              </div>

              <div className="billing-subsection">
                <h4>Emitir factura</h4>
                {policy.canEmitInvoice ? (
                  <form className="billing-form" onSubmit={crearFactura}>
                    <div className="billing-row">
                      <label>
                        Tipo documento
                        <select name="tipo_documento" value={invoiceForm.tipo_documento} onChange={handleInvoiceChange}>
                          <option value="Factura">Factura</option>
                          <option value="Boleta">Boleta</option>
                        </select>
                      </label>
                      <label>
                        Tipo emision
                        <select name="tipo_emision" value={invoiceForm.tipo_emision} onChange={handleInvoiceChange}>
                          <option value="Electronica">Electronica</option>
                          <option value="Manual">Manual</option>
                        </select>
                      </label>
                    </div>
                    <div className="billing-row">
                      <label>
                        Nombre cliente
                        <input name="cliente_nombre" value={invoiceForm.cliente_nombre} onChange={handleInvoiceChange} required />
                      </label>
                      <label>
                        Identidad
                        <input name="cliente_identidad" value={invoiceForm.cliente_identidad} onChange={handleInvoiceChange} />
                      </label>
                      <label>
                        Correo
                        <input name="cliente_correo" value={invoiceForm.cliente_correo} onChange={handleInvoiceChange} />
                      </label>
                    </div>
                    <label className="full-width">
                      Motivo
                      <input name="motivo" value={invoiceForm.motivo} onChange={handleInvoiceChange} />
                    </label>
                    <button type="submit" className="primary-button">
                      Crear factura
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : (
            <p>Seleccione una venta para ver su detalle y registrar pagos o factura.</p>
          )}
        </article>

        <article className="billing-card">
          <div className="form-heading">
            <h3>Facturas emitidas</h3>
          </div>
          <div className="billing-table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Venta</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((factura) => (
                  <tr key={factura.factura_id}>
                    <td>{factura.numero_factura}</td>
                    <td>{factura.venta_id}</td>
                    <td>{factura.cliente_nombre || '-'}</td>
                    <td>{factura.total?.toFixed(2) ?? '-'}</td>
                    <td>{factura.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
};
