const { sql, getPool } = require('../config/db');

function normalizarEstado(estado) {
    const valores = ['Emitida', 'Enviada', 'En proceso', 'Terminada', 'Entregada'];
    return valores.includes(estado) ? estado : 'Emitida';
}

function construirHistorial(estado, detalle = '') {
    const fecha = new Date().toISOString();
    return JSON.stringify([{ estado, detalle, fecha_hora: fecha }]);
}

async function listarOrdenes(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT
                o.orden_id,
                o.numero_orden,
                o.paciente_id,
                o.historia_id,
                o.estado,
                o.laboratorio_externo,
                o.telefono_laboratorio,
                o.descripcion_mica,
                o.descripcion_armazon,
                o.observaciones,
                o.fecha_prometida,
                o.fecha_entrega_real,
                o.entregado_por,
                o.entregado_a,
                o.notificado,
                o.notificado_en,
                o.historial_estados,
                o.creado_por,
                o.creado_en,
                o.actualizado_en,
                CONCAT(p.nombres, ' ', p.apellidos) AS paciente_nombre
            FROM OrdenesLaboratorio o
            LEFT JOIN Pacientes p ON p.paciente_id = o.paciente_id
            ORDER BY o.creado_en DESC
        `);

        return res.json(result.recordset);
    } catch (err) {
        console.error('Error listando órdenes de laboratorio:', err);
        return res.status(500).json({ message: 'Error al consultar órdenes de laboratorio' });
    }
}

async function obtenerOrden(req, res) {
    const id = Number(req.params.id);

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT
                    o.orden_id,
                    o.numero_orden,
                    o.paciente_id,
                    o.historia_id,
                    o.estado,
                    o.laboratorio_externo,
                    o.telefono_laboratorio,
                    o.descripcion_mica,
                    o.descripcion_armazon,
                    o.observaciones,
                    o.fecha_prometida,
                    o.fecha_entrega_real,
                    o.entregado_por,
                    o.entregado_a,
                    o.notificado,
                    o.notificado_en,
                    o.historial_estados,
                    o.creado_por,
                    o.creado_en,
                    o.actualizado_en,
                    CONCAT(p.nombres, ' ', p.apellidos) AS paciente_nombre
                FROM OrdenesLaboratorio o
                LEFT JOIN Pacientes p ON p.paciente_id = o.paciente_id
                WHERE o.orden_id = @id
            `);

        const orden = result.recordset[0];
        if (!orden) {
            return res.status(404).json({ message: 'Orden de laboratorio no encontrada' });
        }

        return res.json(orden);
    } catch (err) {
        console.error('Error obteniendo orden de laboratorio:', err);
        return res.status(500).json({ message: 'Error al consultar la orden' });
    }
}

async function crearOrden(req, res) {
    const {
        paciente_id,
        historia_id,
        laboratorio_externo,
        telefono_laboratorio,
        descripcion_mica,
        descripcion_armazon,
        observaciones,
        fecha_prometida,
        estado = 'Emitida',
    } = req.body;

    if (!paciente_id) {
        return res.status(400).json({ message: 'El paciente es requerido' });
    }

    try {
        const pool = await getPool();
        const numero_orden = `LAB-${Date.now().toString().slice(-6)}`;
        const historial = construirHistorial(normalizarEstado(estado), 'Orden creada');

        const result = await pool.request()
            .input('paciente_id', sql.Int, Number(paciente_id))
            .input('historia_id', sql.Int, historia_id ? Number(historia_id) : null)
            .input('estado', sql.VarChar(20), normalizarEstado(estado))
            .input('laboratorio_externo', sql.VarChar(200), laboratorio_externo || null)
            .input('telefono_laboratorio', sql.VarChar(20), telefono_laboratorio || null)
            .input('descripcion_mica', sql.NVarChar(300), descripcion_mica || null)
            .input('descripcion_armazon', sql.NVarChar(300), descripcion_armazon || null)
            .input('observaciones', sql.NVarChar(500), observaciones || null)
            .input('fecha_prometida', sql.Date, fecha_prometida ? new Date(fecha_prometida) : null)
            .input('historial_estados', sql.NVarChar(sql.MAX), historial)
            .input('creado_por', sql.Int, req.user?.empleado_id || null)
            .query(`
                INSERT INTO OrdenesLaboratorio (
                    paciente_id,
                    historia_id,
                    estado,
                    laboratorio_externo,
                    telefono_laboratorio,
                    descripcion_mica,
                    descripcion_armazon,
                    observaciones,
                    fecha_prometida,
                    historial_estados,
                    creado_por,
                    creado_en,
                    actualizado_en
                )
                OUTPUT INSERTED.orden_id, INSERTED.numero_orden
                VALUES (
                    @paciente_id,
                    @historia_id,
                    @estado,
                    @laboratorio_externo,
                    @telefono_laboratorio,
                    @descripcion_mica,
                    @descripcion_armazon,
                    @observaciones,
                    @fecha_prometida,
                    @historial_estados,
                    @creado_por,
                    SYSUTCDATETIME(),
                    SYSUTCDATETIME()
                )
            `);

        return res.status(201).json({
            message: 'Orden de laboratorio creada correctamente',
            orden_id: result.recordset[0].orden_id,
            numero_orden,
        });
    } catch (err) {
        console.error('Error creando orden de laboratorio:', err);
        return res.status(500).json({ message: 'Error al crear la orden de laboratorio' });
    }
}

async function actualizarEstado(req, res) {
    const id = Number(req.params.id);
    const { estado, detalle = 'Estado actualizado' } = req.body;

    if (!estado) {
        return res.status(400).json({ message: 'El estado es requerido' });
    }

    try {
        const pool = await getPool();
        const actual = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT orden_id, estado, historial_estados, fecha_entrega_real FROM OrdenesLaboratorio WHERE orden_id = @id');

        const orden = actual.recordset[0];
        if (!orden) {
            return res.status(404).json({ message: 'Orden de laboratorio no encontrada' });
        }

        let historial = [];
        try {
            historial = orden.historial_estados ? JSON.parse(orden.historial_estados) : [];
        } catch (error) {
            historial = [];
        }

        historial.push({ estado: normalizarEstado(estado), detalle, fecha_hora: new Date().toISOString() });

        const fechaEntrega = normalizarEstado(estado) === 'Entregada' ? new Date() : orden.fecha_entrega_real;

        await pool.request()
            .input('id', sql.Int, id)
            .input('estado', sql.VarChar(20), normalizarEstado(estado))
            .input('historial_estados', sql.NVarChar(sql.MAX), JSON.stringify(historial))
            .input('fecha_entrega_real', sql.DateTime2, fechaEntrega)
            .query(`
                UPDATE OrdenesLaboratorio
                SET estado = @estado,
                    historial_estados = @historial_estados,
                    fecha_entrega_real = @fecha_entrega_real,
                    actualizado_en = SYSUTCDATETIME()
                WHERE orden_id = @id
            `);

        return res.json({ message: 'Estado actualizado correctamente' });
    } catch (err) {
        console.error('Error actualizando estado de laboratorio:', err);
        return res.status(500).json({ message: 'Error al actualizar el estado' });
    }
}

async function entregarOrden(req, res) {
    const id = Number(req.params.id);
    const { entregado_a = 'Paciente' } = req.body;

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT orden_id, estado, historial_estados FROM OrdenesLaboratorio WHERE orden_id = @id');

        const orden = result.recordset[0];
        if (!orden) {
            return res.status(404).json({ message: 'Orden de laboratorio no encontrada' });
        }

        let historial = [];
        try {
            historial = orden.historial_estados ? JSON.parse(orden.historial_estados) : [];
        } catch (error) {
            historial = [];
        }

        historial.push({ estado: 'Entregada', detalle: `Entregada a ${entregado_a}`, fecha_hora: new Date().toISOString() });

        await pool.request()
            .input('id', sql.Int, id)
            .input('estado', sql.VarChar(20), 'Entregada')
            .input('entregado_a', sql.VarChar(200), entregado_a)
            .input('entregado_por', sql.Int, req.user?.empleado_id || null)
            .input('historial_estados', sql.NVarChar(sql.MAX), JSON.stringify(historial))
            .input('fecha_entrega_real', sql.DateTime2, new Date())
            .query(`
                UPDATE OrdenesLaboratorio
                SET estado = @estado,
                    entregado_a = @entregado_a,
                    entregado_por = @entregado_por,
                    fecha_entrega_real = @fecha_entrega_real,
                    historial_estados = @historial_estados,
                    actualizado_en = SYSUTCDATETIME()
                WHERE orden_id = @id
            `);

        return res.json({ message: 'Orden marcada como entregada' });
    } catch (err) {
        console.error('Error entregando orden de laboratorio:', err);
        return res.status(500).json({ message: 'Error al entregar la orden' });
    }
}

module.exports = {
    listarOrdenes,
    obtenerOrden,
    crearOrden,
    actualizarEstado,
    entregarOrden,
};
