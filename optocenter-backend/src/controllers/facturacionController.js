const { sql, getPool } = require('../config/db');

function getBillingAccessPolicy(rolId) {
    const numericRoleId = Number(rolId);

    if (numericRoleId === 1) {
        return {
            canViewBilling: true,
            canCreateSale: false,
            canConfirmSale: false,
            canVoidSale: false,
            canManagePayments: false,
            canEmitInvoice: false,
        };
    }

    if (numericRoleId === 3) {
        return {
            canViewBilling: true,
            canCreateSale: true,
            canConfirmSale: true,
            canVoidSale: true,
            canManagePayments: true,
            canEmitInvoice: true,
        };
    }

    return {
        canViewBilling: false,
        canCreateSale: false,
        canConfirmSale: false,
        canVoidSale: false,
        canManagePayments: false,
        canEmitInvoice: false,
    };
}

function normalizarEstadoVenta(estado) {
    const valor = String(estado || '').trim();
    if (['Confirmada', 'Anulada'].includes(valor)) {
        return valor;
    }
    return 'Confirmada';
}

function validarVenta(data) {
    if (!Array.isArray(data.items) || data.items.length === 0) {
        return 'La venta debe contener al menos un producto.';
    }
    for (const item of data.items) {
        if (!item.producto_id) return 'Cada linea de venta debe incluir un producto.';
        if (!item.cantidad || Number(item.cantidad) <= 0) return 'Cada linea de venta debe incluir una cantidad valida.';
        if (item.precio_unitario === undefined || Number(item.precio_unitario) < 0) return 'Cada linea de venta debe incluir un precio unitario valido.';
    }
    return null;
}

function validarFactura(data) {
    if (!data.venta_id) return 'Debe seleccionar una venta para generar la factura.';
    if (!data.tipo_documento) return 'Debe indicar el tipo de documento.';
    if (!data.tipo_emision) return 'Debe indicar el tipo de emision.';
    return null;
}

function validarPago(data) {
    if (!data.forma_pago) return 'Debe seleccionar la forma de pago.';
    if (!data.monto || Number(data.monto) <= 0) return 'Debe indicar un monto valido.';
    return null;
}

function mapVenta(row) {
    return {
        venta_id: row.venta_id,
        numero_venta: row.numero_venta,
        paciente_id: row.paciente_id,
        historia_id: row.historia_id,
        caja_id: row.caja_id,
        vendedor_id: row.vendedor_id,
        estado: row.estado,
        subtotal: row.subtotal,
        descuento_total: row.descuento_total,
        impuestos: row.impuestos,
        total: row.total,
        motivo_descuento: row.motivo_descuento,
        motivo_anulacion: row.motivo_anulacion,
        anulada_por: row.anulada_por,
        anulada_en: row.anulada_en,
        creado_en: row.creado_en,
        confirmada_en: row.confirmada_en,
        cliente_nombre: row.cliente_nombre,
        cliente_identidad: row.cliente_identidad,
    };
}

function mapFactura(row) {
    return {
        factura_id: row.factura_id,
        numero_factura: row.numero_factura,
        venta_id: row.venta_id,
        historia_id: row.historia_id,
        tipo_documento: row.tipo_documento,
        tipo_emision: row.tipo_emision,
        estado: row.estado,
        factura_origen_id: row.factura_origen_id,
        cliente_nombre: row.cliente_nombre,
        cliente_identidad: row.cliente_identidad,
        cliente_correo: row.cliente_correo,
        subtotal: row.subtotal,
        descuento: row.descuento,
        impuestos: row.impuestos,
        total: row.total,
        motivo: row.motivo,
        autorizado_por: row.autorizado_por,
        pdf_ruta: row.pdf_ruta,
        fecha_emision: row.fecha_emision,
    };
}
async function generarNumeroConsecutivo(pool, tabla, columna) {
    const result = await pool.request()
        .query(`SELECT MAX(CAST(SUBSTRING(${columna}, 2, LEN(${columna})) AS INT)) AS max_num FROM ${tabla}`);
    const maxNum = result.recordset[0].max_num || 0;
    const siguiente = maxNum + 1;
    return `F${String(siguiente).padStart(6, '0')}`;
}


async function listarVentas(req, res) {
    const { buscar = '' } = req.query;
    const termino = `%${buscar.trim()}%`;
    const policy = getBillingAccessPolicy(req.user?.rol_id);

    if (!policy.canViewBilling) {
        return res.status(403).json({ message: 'No tienes permisos para ver facturación' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('buscar', sql.VarChar(160), termino)
            .query(`SELECT
                        v.venta_id, v.numero_venta, v.paciente_id, v.historia_id, v.caja_id, v.vendedor_id,
                        v.estado, v.subtotal, v.descuento_total, v.impuestos, v.total,
                        v.motivo_descuento, v.motivo_anulacion, v.anulada_por, v.anulada_en,
                        v.creado_en, v.confirmada_en,
                        p.numero_identidad AS cliente_identidad,
                        CONCAT(p.nombres, ' ', p.apellidos) AS cliente_nombre
                    FROM Ventas v
                    LEFT JOIN Pacientes p ON p.paciente_id = v.paciente_id
                    WHERE @buscar = '%%'
                       OR v.numero_venta LIKE @buscar
                       OR p.numero_identidad LIKE @buscar
                       OR p.nombres LIKE @buscar
                       OR p.apellidos LIKE @buscar
                    ORDER BY v.creado_en DESC`);

        return res.json(result.recordset.map(mapVenta));
    } catch (err) {
        console.error('Error listando ventas:', err);
        return res.status(500).json({ message: 'Error al consultar ventas' });
    }
}

async function obtenerVenta(req, res) {
    const id = Number(req.params.id);
    const policy = getBillingAccessPolicy(req.user?.rol_id);

    if (!policy.canViewBilling) {
        return res.status(403).json({ message: 'No tienes permisos para ver facturación' });
    }

    try {
        const pool = await getPool();
        const ventaResult = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT
                        v.venta_id, v.numero_venta, v.paciente_id, v.historia_id, v.caja_id, v.vendedor_id,
                        v.estado, v.subtotal, v.descuento_total, v.impuestos, v.total,
                        v.motivo_descuento, v.motivo_anulacion, v.anulada_por, v.anulada_en,
                        v.creado_en, v.confirmada_en,
                        p.numero_identidad AS cliente_identidad,
                        CONCAT(p.nombres, ' ', p.apellidos) AS cliente_nombre
                    FROM Ventas v
                    LEFT JOIN Pacientes p ON p.paciente_id = v.paciente_id
                    WHERE v.venta_id = @id`);

        const venta = ventaResult.recordset[0];
        if (!venta) {
            return res.status(404).json({ message: 'Venta no encontrada' });
        }

        const detalleResult = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT dv.detalle_venta_id, dv.venta_id, dv.producto_id, dv.cantidad,
                           dv.precio_unitario, dv.descuento_pct, dv.subtotal,
                           p.nombre AS producto_nombre
                    FROM DetalleVenta dv
                    LEFT JOIN Productos p ON p.producto_id = dv.producto_id
                    WHERE dv.venta_id = @id`);

        const pagosResult = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT pago_id, venta_id, forma_pago, monto, referencia, banco, fecha_hora
                    FROM PagosVenta
                    WHERE venta_id = @id
                    ORDER BY fecha_hora DESC`);

        return res.json({
            ...mapVenta(venta),
            detalles: detalleResult.recordset,
            pagos: pagosResult.recordset,
        });
    } catch (err) {
        console.error('Error obteniendo venta:', err);
        return res.status(500).json({ message: 'Error al consultar la venta' });
    }
}

async function crearVenta(req, res) {
    const error = validarVenta(req.body);
    if (error) return res.status(400).json({ message: error });

    const policy = getBillingAccessPolicy(req.user?.rol_id);

    if (!policy.canCreateSale) {
        return res.status(403).json({ message: 'No tienes permisos para crear ventas' });
    }

    const {
        paciente_id,
        estado,
        impuestos = 0,
        motivo_descuento,
        items,
        forma_pago,
        monto,
    } = req.body;

    const estadoVenta = normalizarEstadoVenta(estado);
    const subtotal = items.reduce(
        (total, item) => total + Number(item.cantidad) * Number(item.precio_unitario),
        0
    );
    const descuento_total = items.reduce(
        (total, item) => total + Number(item.cantidad) * Number(item.precio_unitario) * (Number(item.descuento_pct) || 0) / 100,
        0
    );
    const impuestoValor = Number(impuestos) || 0;
    const total = subtotal - descuento_total + impuestoValor;

    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            request.input('paciente_id', sql.Int, paciente_id ? Number(paciente_id) : null)
                .input('historia_id', sql.Int, null)
                .input('caja_id', sql.Int, null)
                .input('vendedor_id', sql.Int, null)
                .input('estado', sql.VarChar(30), estadoVenta)
                .input('subtotal', sql.Decimal(18, 4), subtotal)
                .input('descuento_total', sql.Decimal(18, 4), descuento_total)
                .input('impuestos', sql.Decimal(18, 4), impuestoValor)
                .input('total', sql.Decimal(18, 4), total)
                .input('motivo_descuento', sql.VarChar(300), motivo_descuento || null);

            const ventaResult = await request.query(`INSERT INTO Ventas
                    (paciente_id, historia_id, caja_id, vendedor_id, estado,
                     subtotal, descuento_total, impuestos, total, motivo_descuento,
                     creado_en)
                OUTPUT INSERTED.venta_id
                VALUES
                    (@paciente_id, @historia_id, @caja_id, @vendedor_id, @estado,
                     @subtotal, @descuento_total, @impuestos, @total, @motivo_descuento,
                     SYSUTCDATETIME())`);

            const venta_id = ventaResult.recordset[0].venta_id;
            if (forma_pago) {
                await new sql.Request(transaction)
                    .input('venta_id', sql.Int, venta_id)
                    .input('forma_pago', sql.VarChar(30), forma_pago)
                    .input('monto', sql.Decimal(18, 4), Number(monto ?? total))
                    .input('referencia', sql.VarChar(100), null)
                    .input('banco', sql.VarChar(100), null)
                    .query(`INSERT INTO PagosVenta
                            (venta_id, forma_pago, monto, referencia, banco, fecha_hora)
                            VALUES
                            (@venta_id, @forma_pago, @monto, @referencia, @banco, SYSUTCDATETIME())`);
            }

for (const item of items) {
    await new sql.Request(transaction)
        .input('venta_id', sql.Int, venta_id)
        .input('producto_id', sql.Int, Number(item.producto_id))
        .input('cantidad', sql.Decimal(18, 4), Number(item.cantidad))
        .input('precio_unitario', sql.Decimal(18, 4), Number(item.precio_unitario))
        .input('descuento_pct', sql.Decimal(18, 4), Number(item.descuento_pct) || 0)
        .query(`INSERT INTO DetalleVenta
                (venta_id, producto_id, cantidad, precio_unitario, descuento_pct)
                VALUES
                (@venta_id, @producto_id, @cantidad, @precio_unitario, @descuento_pct)`);
}

            await transaction.commit();
            return res.status(201).json({ message: 'Venta creada correctamente', venta_id });
        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }
    } catch (err) {
        console.error('Error creando venta:', err);
        return res.status(500).json({ message: 'Error al crear la venta' });
    }
}

async function confirmarVenta(req, res) {
    const id = Number(req.params.id);
    const policy = getBillingAccessPolicy(req.user?.rol_id);

    if (!policy.canConfirmSale) {
        return res.status(403).json({ message: 'No tienes permisos para confirmar ventas' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`UPDATE Ventas
                    SET estado = 'Confirmada', confirmada_en = SYSUTCDATETIME()
                    WHERE venta_id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Venta no encontrada' });
        }

        return res.json({ message: 'Venta confirmada correctamente' });
    } catch (err) {
        console.error('Error confirmando venta:', err);
        return res.status(500).json({ message: 'Error al confirmar la venta' });
    }
}

async function anularVenta(req, res) {
    const id = Number(req.params.id);
    const { motivo } = req.body;
    const policy = getBillingAccessPolicy(req.user?.rol_id);

    if (!policy.canVoidSale) {
        return res.status(403).json({ message: 'No tienes permisos para anular ventas' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('motivo', sql.VarChar(500), motivo || null)
            .input('anulada_por', sql.Int, req.user?.empleado_id || null)
            .query(`UPDATE Ventas
                    SET estado = 'Anulada', motivo_anulacion = @motivo,
                        anulada_por = @anulada_por, anulada_en = SYSUTCDATETIME()
                    WHERE venta_id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Venta no encontrada' });
        }

        return res.json({ message: 'Venta anulada correctamente' });
    } catch (err) {
        console.error('Error anulando venta:', err);
        return res.status(500).json({ message: 'Error al anular la venta' });
    }
}

async function listarFacturas(req, res) {
    const { buscar = '' } = req.query;
    const termino = `%${buscar.trim()}%`;
    const policy = getBillingAccessPolicy(req.user?.rol_id);

    if (!policy.canViewBilling) {
        return res.status(403).json({ message: 'No tienes permisos para ver facturación' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('buscar', sql.VarChar(160), termino)
            .query(`SELECT f.factura_id, f.numero_factura, f.venta_id, f.historia_id, f.tipo_documento,
                           f.tipo_emision, f.estado, f.factura_origen_id, f.cliente_nombre,
                           f.cliente_identidad, f.cliente_correo, f.subtotal, f.descuento,
                           f.impuestos, f.total, f.motivo, f.autorizado_por, f.pdf_ruta,
                           f.fecha_emision,
                           v.numero_venta
                    FROM Facturas f
                    LEFT JOIN Ventas v ON v.venta_id = f.venta_id
                    WHERE @buscar = '%%'
                       OR f.numero_factura LIKE @buscar
                       OR f.cliente_nombre LIKE @buscar
                       OR f.cliente_identidad LIKE @buscar
                       OR v.numero_venta LIKE @buscar
                    ORDER BY f.fecha_emision DESC`);

        return res.json(result.recordset.map(mapFactura));
    } catch (err) {
        console.error('Error listando facturas:', err);
        return res.status(500).json({ message: 'Error al consultar facturas' });
    }
}

async function obtenerFactura(req, res) {
    const id = Number(req.params.id);
    const policy = getBillingAccessPolicy(req.user?.rol_id);

    if (!policy.canViewBilling) {
        return res.status(403).json({ message: 'No tienes permisos para ver facturación' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT factura_id, numero_factura, venta_id, historia_id, tipo_documento,
                           tipo_emision, estado, factura_origen_id, cliente_nombre,
                           cliente_identidad, cliente_correo, subtotal, descuento,
                           impuestos, total, motivo, autorizado_por, pdf_ruta, fecha_emision
                    FROM Facturas
                    WHERE factura_id = @id`);

        const factura = result.recordset[0];
        if (!factura) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        return res.json(mapFactura(factura));
    } catch (err) {
        console.error('Error obteniendo factura:', err);
        return res.status(500).json({ message: 'Error al consultar la factura' });
    }
}

async function crearFactura(req, res) {
    const policy = getBillingAccessPolicy(req.user?.rol_id);

    if (!policy.canEmitInvoice) {
        return res.status(403).json({ message: 'No tienes permisos para emitir facturas' });
    }

    const error = validarFactura(req.body);
    if (error) return res.status(400).json({ message: error });

    const {
        venta_id,
        tipo_documento,
        tipo_emision,
        cliente_nombre,
        cliente_identidad,
        cliente_correo,
        motivo,
        factura_origen_id,
    } = req.body;

    try {
        const pool = await getPool();
        const ventaResult = await pool.request()
            .input('id', sql.Int, Number(venta_id))
            .query(`SELECT venta_id, subtotal, descuento_total, impuestos, total, historia_id FROM Ventas WHERE venta_id = @id`);

        const venta = ventaResult.recordset[0];
        if (!venta) {
            return res.status(404).json({ message: 'Venta no encontrada para facturar' });
        }

        const numeroFactura = await generarNumeroConsecutivo(pool, 'Facturas', 'numero_factura');
        const request = pool.request();
        request.input('numero_factura', sql.VarChar(30), numeroFactura)
            .input('venta_id', sql.Int, Number(venta_id))
            .input('historia_id', sql.Int, venta.historia_id || null)
            .input('tipo_documento', sql.VarChar(20), tipo_documento)
            .input('tipo_emision', sql.VarChar(20), tipo_emision)
            .input('estado', sql.VarChar(20), 'Emitida')
            .input('factura_origen_id', sql.Int, factura_origen_id ? Number(factura_origen_id) : null)
            .input('cliente_nombre', sql.VarChar(200), cliente_nombre || null)
            .input('cliente_identidad', sql.VarChar(30), cliente_identidad || null)
            .input('cliente_correo', sql.VarChar(150), cliente_correo || null)
            .input('subtotal', sql.Decimal(18, 4), venta.subtotal)
            .input('descuento', sql.Decimal(18, 4), venta.descuento_total)
            .input('impuestos', sql.Decimal(18, 4), venta.impuestos)
            .input('total', sql.Decimal(18, 4), venta.total)
            .input('motivo', sql.NVarChar(300), motivo || null)
            .input('autorizado_por', sql.Int, req.user?.empleado_id || null)
            .input('pdf_ruta', sql.VarChar(500), null);

        const facturaResult = await request.query(`INSERT INTO Facturas
                (numero_factura, venta_id, historia_id, tipo_documento, tipo_emision,
                 estado, factura_origen_id, cliente_nombre, cliente_identidad, cliente_correo,
                 subtotal, descuento, impuestos, total, motivo, autorizado_por, pdf_ruta,
                 fecha_emision)
            OUTPUT INSERTED.factura_id
            VALUES
                (@numero_factura, @venta_id, @historia_id, @tipo_documento, @tipo_emision,
                 @estado, @factura_origen_id, @cliente_nombre, @cliente_identidad, @cliente_correo,
                 @subtotal, @descuento, @impuestos, @total, @motivo, @autorizado_por, @pdf_ruta,
                 SYSUTCDATETIME())`);

        return res.status(201).json({ message: 'Factura creada correctamente', factura_id: facturaResult.recordset[0].factura_id });
    } catch (err) {
        console.error('Error creando factura:', err);
        return res.status(500).json({ message: 'Error al crear la factura' });
    }
}

async function listarPagosVenta(req, res) {
    const id = Number(req.params.id);
    const policy = getBillingAccessPolicy(req.user?.rol_id);

    if (!policy.canViewBilling) {
        return res.status(403).json({ message: 'No tienes permisos para ver facturación' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT pago_id, venta_id, forma_pago, monto, referencia, banco, fecha_hora
                    FROM PagosVenta
                    WHERE venta_id = @id
                    ORDER BY fecha_hora DESC`);

        return res.json(result.recordset);
    } catch (err) {
        console.error('Error listando pagos de venta:', err);
        return res.status(500).json({ message: 'Error al consultar pagos' });
    }
}

async function registrarPagoVenta(req, res) {
    const id = Number(req.params.id);
    const policy = getBillingAccessPolicy(req.user?.rol_id);

    if (!policy.canManagePayments) {
        return res.status(403).json({ message: 'No tienes permisos para registrar pagos' });
    }

    const error = validarPago(req.body);
    if (error) return res.status(400).json({ message: error });

    const { forma_pago, monto, referencia, banco } = req.body;
    try {
        const pool = await getPool();
        const resultVenta = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT venta_id FROM Ventas WHERE venta_id = @id');

        if (resultVenta.recordset.length === 0) {
            return res.status(404).json({ message: 'Venta no encontrada' });
        }

        await pool.request()
            .input('venta_id', sql.Int, id)
            .input('forma_pago', sql.VarChar(30), forma_pago)
            .input('monto', sql.Decimal(18, 4), Number(monto))
            .input('referencia', sql.VarChar(100), referencia || null)
            .input('banco', sql.VarChar(100), banco || null)
            .query(`INSERT INTO PagosVenta
                    (venta_id, forma_pago, monto, referencia, banco, fecha_hora)
                VALUES
                    (@venta_id, @forma_pago, @monto, @referencia, @banco, SYSUTCDATETIME())`);

        return res.status(201).json({ message: 'Pago registrado correctamente' });
    } catch (err) {
        console.error('Error registrando pago de venta:', err);
        return res.status(500).json({ message: 'Error al registrar el pago' });
    }
}

module.exports = {
    listarVentas,
    obtenerVenta,
    crearVenta,
    confirmarVenta,
    anularVenta,
    listarFacturas,
    obtenerFactura,
    crearFactura,
    listarPagosVenta,
    registrarPagoVenta,
};
