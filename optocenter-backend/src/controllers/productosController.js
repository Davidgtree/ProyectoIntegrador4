const { sql, getPool } = require('../config/db');

async function registrarAuditoria(pool, { empleado_id, accion, detalle, ip, registro_id }) {
    try {
        await pool.request()
            .input('empleado_id', sql.Int, empleado_id || null)
            .input('accion', sql.VarChar(80), accion)
            .input('detalle', sql.NVarChar(sql.MAX), detalle || null)
            .input('registro_id', sql.Int, registro_id || null)
            .input('ip_origen', sql.VarChar(45), ip || '0.0.0.0')
            .query(`INSERT INTO AuditoriaLog (empleado_id, modulo, accion, tabla_afectada, registro_id, detalle, ip_origen, fecha_hora)
                    VALUES (@empleado_id, 'Productos', @accion, 'Productos', @registro_id, @detalle, @ip_origen, SYSUTCDATETIME())`);
    } catch (err) {
        console.error('No se pudo registrar auditoria de productos:', err.message);
    }
}

async function registrarMovimientoInventario(pool, {
    producto_id,
    tipo_movimiento,
    cantidad,
    stock_anterior,
    stock_posterior,
    costo_unitario,
    referencia_tipo,
    referencia_id,
    notas,
    realizado_por,
}) {
    try {
        await pool.request()
            .input('producto_id', sql.Int, producto_id)
            .input('tipo_movimiento', sql.VarChar(60), tipo_movimiento)
            .input('cantidad', sql.Decimal(18, 4), cantidad)
            .input('stock_anterior', sql.Decimal(18, 4), stock_anterior)
            .input('stock_posterior', sql.Decimal(18, 4), stock_posterior)
            .input('costo_unitario', sql.Decimal(18, 4), costo_unitario || null)
            .input('referencia_tipo', sql.VarChar(60), referencia_tipo || null)
            .input('referencia_id', sql.Int, referencia_id || null)
            .input('notas', sql.NVarChar(sql.MAX), notas || null)
            .input('realizado_por', sql.Int, realizado_por || null)
            .query(`INSERT INTO MovimientosInventario
                    (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_posterior, costo_unitario,
                     referencia_tipo, referencia_id, notas, realizado_por, fecha_hora)
                    VALUES
                    (@producto_id, @tipo_movimiento, @cantidad, @stock_anterior, @stock_posterior, @costo_unitario,
                     @referencia_tipo, @referencia_id, @notas, @realizado_por, SYSUTCDATETIME())`);
    } catch (err) {
        console.error('No se pudo registrar movimiento de inventario:', err.message);
    }
}

function validarProducto(data) {
    const requeridos = ['nombre', 'precio_costo', 'precio_venta', 'stock_actual', 'unidad_medida'];
    const faltantes = requeridos.filter((campo) => !String(data[campo] || '').trim());
    if (faltantes.length > 0) {
        return `Campos requeridos faltantes: ${faltantes.join(', ')}`;
    }

    const precioCosto = Number(data.precio_costo);
    const precioVenta = Number(data.precio_venta);
    const stockActual = Number(data.stock_actual);
    if (Number.isNaN(precioCosto) || precioCosto < 0) return 'Precio de costo invalido';
    if (Number.isNaN(precioVenta) || precioVenta < 0) return 'Precio de venta invalido';
    if (Number.isNaN(stockActual) || stockActual < 0) return 'Stock actual invalido';

    return null;
}

function mapProducto(row) {
    return {
        producto_id: row.producto_id,
        categoria_id: row.categoria_id,
        categoria_nombre: row.categoria_nombre,
        proveedor_id: row.proveedor_id,
        proveedor_nombre: row.proveedor_nombre,
        codigo_barras: row.codigo_barras,
        sku: row.sku,
        nombre: row.nombre,
        descripcion: row.descripcion,
        esfera: row.esfera,
        cilindro: row.cilindro,
        eje: row.eje,
        adicion: row.adicion,
        material: row.material,
        color: row.color,
        tratamiento: row.tratamiento,
        precio_costo: row.precio_costo,
        precio_venta: row.precio_venta,
        stock_actual: row.stock_actual,
        stock_minimo: row.stock_minimo,
        stock_maximo: row.stock_maximo,
        unidad_medida: row.unidad_medida,
        activo: Boolean(row.activo),
        creado_en: row.creado_en,
        actualizado_en: row.actualizado_en,
    };
}

async function obtenerOpciones(req, res) {
    try {
        const pool = await getPool();
        const [categorias, proveedores] = await Promise.all([
            pool.request().query(`SELECT categoria_id, nombre FROM Categorias WHERE activa = 1 ORDER BY nombre`),
            pool.request().query(`SELECT proveedor_id, razon_social, telefono, correo FROM Proveedores WHERE activo = 1 ORDER BY razon_social`),
        ]);

        return res.json({
            categorias: categorias.recordset,
            proveedores: proveedores.recordset,
        });
    } catch (err) {
        console.error('Error consultando opciones de productos:', err);
        return res.status(500).json({ message: 'Error al consultar opciones de inventario' });
    }
}

async function listarProductos(req, res) {
    const { buscar = '' } = req.query;
    const termino = `%${buscar.trim()}%`;

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('buscar', sql.VarChar(160), termino)
            .query(`SELECT
                        p.producto_id, p.categoria_id, c.nombre AS categoria_nombre,
                        p.proveedor_id, pr.razon_social AS proveedor_nombre,
                        p.codigo_barras, p.sku, p.nombre, p.descripcion,
                        p.esfera, p.cilindro, p.eje, p.adicion, p.material, p.color,
                        p.tratamiento, p.precio_costo, p.precio_venta, p.stock_actual,
                        p.stock_minimo, p.stock_maximo, p.unidad_medida, p.activo,
                        p.creado_en, p.actualizado_en
                    FROM Productos p
                    LEFT JOIN Categorias c ON c.categoria_id = p.categoria_id
                    LEFT JOIN Proveedores pr ON pr.proveedor_id = p.proveedor_id
                    WHERE @buscar = '%%'
                       OR p.nombre LIKE @buscar
                       OR p.codigo_barras LIKE @buscar
                       OR p.sku LIKE @buscar
                       OR c.nombre LIKE @buscar
                       OR pr.razon_social LIKE @buscar
                    ORDER BY p.nombre`);

        return res.json(result.recordset.map(mapProducto));
    } catch (err) {
        console.error('Error listando productos:', err);
        return res.status(500).json({ message: 'Error al consultar productos' });
    }
}

async function obtenerProducto(req, res) {
    const id = Number(req.params.id);

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT
                        p.producto_id, p.categoria_id, c.nombre AS categoria_nombre,
                        p.proveedor_id, pr.razon_social AS proveedor_nombre,
                        p.codigo_barras, p.sku, p.nombre, p.descripcion,
                        p.esfera, p.cilindro, p.eje, p.adicion, p.material, p.color,
                        p.tratamiento, p.precio_costo, p.precio_venta, p.stock_actual,
                        p.stock_minimo, p.stock_maximo, p.unidad_medida, p.activo,
                        p.creado_en, p.actualizado_en
                    FROM Productos p
                    LEFT JOIN Categorias c ON c.categoria_id = p.categoria_id
                    LEFT JOIN Proveedores pr ON pr.proveedor_id = p.proveedor_id
                    WHERE p.producto_id = @id`);

        const producto = result.recordset[0];
        if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
        return res.json(mapProducto(producto));
    } catch (err) {
        console.error('Error obteniendo producto:', err);
        return res.status(500).json({ message: 'Error al consultar el producto' });
    }
}

async function crearProducto(req, res) {
    const error = validarProducto(req.body);
    if (error) return res.status(400).json({ message: error });

    const {
        categoria_id,
        proveedor_id,
        codigo_barras,
        sku,
        nombre,
        descripcion,
        esfera,
        cilindro,
        eje,
        adicion,
        material,
        color,
        tratamiento,
        precio_costo,
        precio_venta,
        stock_actual,
        stock_minimo,
        stock_maximo,
        unidad_medida,
        activo,
    } = req.body;

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('categoria_id', sql.Int, Number(categoria_id) || null)
            .input('proveedor_id', sql.Int, Number(proveedor_id) || null)
            .input('codigo_barras', sql.VarChar(60), codigo_barras || null)
            .input('sku', sql.VarChar(60), sku || null)
            .input('nombre', sql.VarChar(200), nombre)
            .input('descripcion', sql.NVarChar(500), descripcion || null)
            .input('esfera', sql.Decimal(18, 4), esfera || null)
            .input('cilindro', sql.Decimal(18, 4), cilindro || null)
            .input('eje', sql.SmallInt, eje || null)
            .input('adicion', sql.Decimal(18, 4), adicion || null)
            .input('material', sql.VarChar(60), material || null)
            .input('color', sql.VarChar(60), color || null)
            .input('tratamiento', sql.VarChar(100), tratamiento || null)
            .input('precio_costo', sql.Decimal(18, 4), Number(precio_costo))
            .input('precio_venta', sql.Decimal(18, 4), Number(precio_venta))
            .input('stock_actual', sql.Decimal(18, 4), Number(stock_actual))
            .input('stock_minimo', sql.Decimal(18, 4), stock_minimo || null)
            .input('stock_maximo', sql.Decimal(18, 4), stock_maximo || null)
            .input('unidad_medida', sql.VarChar(40), unidad_medida)
            .input('activo', sql.Bit, Boolean(activo))
            .query(`INSERT INTO Productos
                    (categoria_id, proveedor_id, codigo_barras, sku, nombre, descripcion,
                     esfera, cilindro, eje, adicion, material, color, tratamiento,
                     precio_costo, precio_venta, stock_actual, stock_minimo, stock_maximo,
                     unidad_medida, activo, creado_en, actualizado_en)
                    OUTPUT INSERTED.producto_id
                    VALUES
                    (@categoria_id, @proveedor_id, @codigo_barras, @sku, @nombre, @descripcion,
                     @esfera, @cilindro, @eje, @adicion, @material, @color, @tratamiento,
                     @precio_costo, @precio_venta, @stock_actual, @stock_minimo, @stock_maximo,
                     @unidad_medida, @activo, SYSUTCDATETIME(), SYSUTCDATETIME())`);

        const producto_id = result.recordset[0].producto_id;
        await registrarMovimientoInventario(pool, {
            producto_id,
            tipo_movimiento: 'Creacion',
            cantidad: Number(stock_actual),
            stock_anterior: 0,
            stock_posterior: Number(stock_actual),
            costo_unitario: Number(precio_costo),
            referencia_tipo: 'Producto',
            referencia_id: producto_id,
            notas: 'Stock inicial',
            realizado_por: req.user?.empleado_id,
        });

        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            accion: 'Crear producto',
            registro_id: producto_id,
            detalle: nombre,
            ip: req.ip,
        });

        return res.status(201).json({ message: 'Producto creado correctamente', producto_id });
    } catch (err) {
        console.error('Error creando producto:', err);
        return res.status(500).json({ message: 'Error al crear producto' });
    }
}

async function actualizarProducto(req, res) {
    const error = validarProducto(req.body);
    if (error) return res.status(400).json({ message: error });

    const id = Number(req.params.id);
    const {
        categoria_id,
        proveedor_id,
        codigo_barras,
        sku,
        nombre,
        descripcion,
        esfera,
        cilindro,
        eje,
        adicion,
        material,
        color,
        tratamiento,
        precio_costo,
        precio_venta,
        stock_actual,
        stock_minimo,
        stock_maximo,
        unidad_medida,
        activo,
    } = req.body;

    try {
        const pool = await getPool();
        const current = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT stock_actual FROM Productos WHERE producto_id = @id');

        if (current.recordset.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const stockAnterior = current.recordset[0].stock_actual;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('categoria_id', sql.Int, Number(categoria_id) || null)
            .input('proveedor_id', sql.Int, Number(proveedor_id) || null)
            .input('codigo_barras', sql.VarChar(60), codigo_barras || null)
            .input('sku', sql.VarChar(60), sku || null)
            .input('nombre', sql.VarChar(200), nombre)
            .input('descripcion', sql.NVarChar(500), descripcion || null)
            .input('esfera', sql.Decimal(18, 4), esfera || null)
            .input('cilindro', sql.Decimal(18, 4), cilindro || null)
            .input('eje', sql.SmallInt, eje || null)
            .input('adicion', sql.Decimal(18, 4), adicion || null)
            .input('material', sql.VarChar(60), material || null)
            .input('color', sql.VarChar(60), color || null)
            .input('tratamiento', sql.VarChar(100), tratamiento || null)
            .input('precio_costo', sql.Decimal(18, 4), Number(precio_costo))
            .input('precio_venta', sql.Decimal(18, 4), Number(precio_venta))
            .input('stock_actual', sql.Decimal(18, 4), Number(stock_actual))
            .input('stock_minimo', sql.Decimal(18, 4), stock_minimo || null)
            .input('stock_maximo', sql.Decimal(18, 4), stock_maximo || null)
            .input('unidad_medida', sql.VarChar(40), unidad_medida)
            .input('activo', sql.Bit, Boolean(activo))
            .query(`UPDATE Productos
                    SET categoria_id = @categoria_id,
                        proveedor_id = @proveedor_id,
                        codigo_barras = @codigo_barras,
                        sku = @sku,
                        nombre = @nombre,
                        descripcion = @descripcion,
                        esfera = @esfera,
                        cilindro = @cilindro,
                        eje = @eje,
                        adicion = @adicion,
                        material = @material,
                        color = @color,
                        tratamiento = @tratamiento,
                        precio_costo = @precio_costo,
                        precio_venta = @precio_venta,
                        stock_actual = @stock_actual,
                        stock_minimo = @stock_minimo,
                        stock_maximo = @stock_maximo,
                        unidad_medida = @unidad_medida,
                        activo = @activo,
                        actualizado_en = SYSUTCDATETIME()
                    WHERE producto_id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        if (Number(stock_actual) !== Number(stockAnterior)) {
            await registrarMovimientoInventario(pool, {
                producto_id: id,
                tipo_movimiento: 'Ajuste',
                cantidad: Number(stock_actual) - Number(stockAnterior),
                stock_anterior: Number(stockAnterior),
                stock_posterior: Number(stock_actual),
                costo_unitario: Number(precio_costo),
                referencia_tipo: 'Producto',
                referencia_id: id,
                notas: 'Ajuste de stock en actualización de producto',
                realizado_por: req.user?.empleado_id,
            });
        }

        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            accion: 'Actualizar producto',
            registro_id: id,
            detalle: nombre,
            ip: req.ip,
        });

        return res.json({ message: 'Producto actualizado correctamente' });
    } catch (err) {
        console.error('Error actualizando producto:', err);
        return res.status(500).json({ message: 'Error al actualizar producto' });
    }
}

async function ajustarStock(req, res) {
    const id = Number(req.params.id);
    const { stock_actual, notas } = req.body;

    if (stock_actual === undefined || stock_actual === null || stock_actual === '') {
        return res.status(400).json({ message: 'Stock actual es requerido' });
    }

    const nuevoStock = Number(stock_actual);
    if (Number.isNaN(nuevoStock) || nuevoStock < 0) {
        return res.status(400).json({ message: 'Stock actual invalido' });
    }

    try {
        const pool = await getPool();
        const current = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT stock_actual, precio_costo FROM Productos WHERE producto_id = @id');

        if (current.recordset.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const { stock_actual: anterior, precio_costo } = current.recordset[0];
        if (Number(anterior) === nuevoStock) {
            return res.status(400).json({ message: 'El stock no ha cambiado' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .input('stock_actual', sql.Decimal(18, 4), nuevoStock)
            .query(`UPDATE Productos SET stock_actual = @stock_actual, actualizado_en = SYSUTCDATETIME() WHERE producto_id = @id`);

        await registrarMovimientoInventario(pool, {
            producto_id: id,
            tipo_movimiento: 'Ajuste',
            cantidad: nuevoStock - Number(anterior),
            stock_anterior: Number(anterior),
            stock_posterior: nuevoStock,
            costo_unitario: Number(precio_costo),
            referencia_tipo: 'Stock',
            referencia_id: id,
            notas: notas || 'Ajuste manual de stock',
            realizado_por: req.user?.empleado_id,
        });

        return res.json({ message: 'Stock ajustado correctamente' });
    } catch (err) {
        console.error('Error ajustando stock:', err);
        return res.status(500).json({ message: 'Error al ajustar el stock' });
    }
}

module.exports = {
    obtenerOpciones,
    listarProductos,
    obtenerProducto,
    crearProducto,
    actualizarProducto,
    ajustarStock,
};
