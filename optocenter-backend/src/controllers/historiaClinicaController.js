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
                    VALUES (@empleado_id, 'HistoriasClinicas', @accion, 'HistoriasClinicas', @registro_id, @detalle, @ip_origen, SYSUTCDATETIME())`);
    } catch (err) {
        console.error('No se pudo registrar auditoria de historias clinicas:', err.message);
    }
}

function validarHistoria(data) {
    const requeridos = ['paciente_id', 'optometra_id', 'motivo_consulta'];
    const faltantes = requeridos.filter((campo) => !String(data[campo] || '').trim());

    if (faltantes.length > 0) {
        return `Campos requeridos faltantes: ${faltantes.join(', ')}`;
    }

    if (data.tipo_diagnostico && !['Presuntivo', 'Definitivo'].includes(data.tipo_diagnostico)) {
        return 'Tipo de diagnostico invalido. Usa Presuntivo o Definitivo.';
    }

    return null;
}

const toNum = (v) => (v === '' || v === undefined || v === null ? null : Number(v));
const toInt = (v) => (v === '' || v === undefined || v === null ? null : parseInt(v, 10));
const toTxt = (v) => (v === '' || v === undefined ? null : v);

// Definicion unica de todos los campos clinicos: [nombre_columna, tipo_sql, transformador]
// Se reutiliza tanto para crear como para actualizar, evitando duplicar 30+ inputs dos veces.
const CAMPOS_CLINICOS = [
    ['antecedentes_personales', sql.NVarChar(sql.MAX), toTxt],
    ['antecedentes_familiares', sql.NVarChar(sql.MAX), toTxt],
    ['antecedentes_oculares', sql.NVarChar(sql.MAX), toTxt],

    ['lens_od_esfera', sql.Decimal(5, 2), toNum],
    ['lens_od_cilindro', sql.Decimal(5, 2), toNum],
    ['lens_od_eje', sql.SmallInt, toInt],
    ['lens_oi_esfera', sql.Decimal(5, 2), toNum],
    ['lens_oi_cilindro', sql.Decimal(5, 2), toNum],
    ['lens_oi_eje', sql.SmallInt, toInt],

    ['avsc_od_lejana', sql.VarChar(20), toTxt],
    ['avsc_oi_lejana', sql.VarChar(20), toTxt],
    ['avsc_od_cercana', sql.VarChar(20), toTxt],
    ['avsc_oi_cercana', sql.VarChar(20), toTxt],
    ['avcc_od_lejana', sql.VarChar(20), toTxt],
    ['avcc_oi_lejana', sql.VarChar(20), toTxt],
    ['avcc_od_cercana', sql.VarChar(20), toTxt],
    ['avcc_oi_cercana', sql.VarChar(20), toTxt],

    ['examen_externo', sql.NVarChar(sql.MAX), toTxt],
    ['reflejo_od', sql.VarChar(100), toTxt],
    ['reflejo_oi', sql.VarChar(100), toTxt],
    ['oftalmoscopia_od', sql.NVarChar(sql.MAX), toTxt],
    ['oftalmoscopia_oi', sql.NVarChar(sql.MAX), toTxt],
    ['examen_motor', sql.NVarChar(sql.MAX), toTxt],

    ['rx_od_esfera', sql.Decimal(5, 2), toNum],
    ['rx_od_cilindro', sql.Decimal(5, 2), toNum],
    ['rx_od_eje', sql.SmallInt, toInt],
    ['rx_od_adicion', sql.Decimal(5, 2), toNum],
    ['rx_oi_esfera', sql.Decimal(5, 2), toNum],
    ['rx_oi_cilindro', sql.Decimal(5, 2), toNum],
    ['rx_oi_eje', sql.SmallInt, toInt],
    ['rx_oi_adicion', sql.Decimal(5, 2), toNum],
    ['distancia_pupilar', sql.Decimal(5, 2), toNum],
    ['indicaciones_receta', sql.VarChar(500), toTxt],

    ['codigo_cie10', sql.VarChar(10), toTxt],
    ['descripcion_cie10', sql.VarChar(300), toTxt],
    ['tipo_diagnostico', sql.VarChar(20), toTxt],
    ['observaciones_dx', sql.NVarChar(sql.MAX), toTxt],
    ['tratamiento', sql.NVarChar(sql.MAX), toTxt],
];

function bindCamposClinicos(request, data) {
    CAMPOS_CLINICOS.forEach(([campo, tipo, transformar]) => {
        request.input(campo, tipo, transformar(data[campo]));
    });
    return request;
}

const SELECT_HISTORIA = `SELECT
        h.historia_id, h.paciente_id, h.cita_id, h.optometra_id, h.fecha_consulta,
        h.bloqueada, h.bloqueada_en, h.motivo_consulta,
        h.antecedentes_personales, h.antecedentes_familiares, h.antecedentes_oculares,
        h.lens_od_esfera, h.lens_od_cilindro, h.lens_od_eje,
        h.lens_oi_esfera, h.lens_oi_cilindro, h.lens_oi_eje,
        h.avsc_od_lejana, h.avsc_oi_lejana, h.avsc_od_cercana, h.avsc_oi_cercana,
        h.avcc_od_lejana, h.avcc_oi_lejana, h.avcc_od_cercana, h.avcc_oi_cercana,
        h.examen_externo, h.reflejo_od, h.reflejo_oi,
        h.oftalmoscopia_od, h.oftalmoscopia_oi, h.examen_motor,
        h.rx_od_esfera, h.rx_od_cilindro, h.rx_od_eje, h.rx_od_adicion,
        h.rx_oi_esfera, h.rx_oi_cilindro, h.rx_oi_eje, h.rx_oi_adicion,
        h.distancia_pupilar, h.indicaciones_receta, h.receta_pdf_ruta,
        h.codigo_cie10, h.descripcion_cie10, h.tipo_diagnostico, h.observaciones_dx, h.tratamiento,
        h.creado_en, h.actualizado_en,
        CONCAT(p.nombres, ' ', p.apellidos) AS paciente_nombre,
        p.numero_identidad AS paciente_identidad,
        CONCAT(e.nombres, ' ', e.apellidos) AS optometra_nombre
    FROM HistoriasClinicas h
    INNER JOIN Pacientes p ON p.paciente_id = h.paciente_id
    INNER JOIN Empleados e ON e.empleado_id = h.optometra_id`;

async function listarHistorias(req, res) {
    const { paciente_id = '', buscar = '' } = req.query;

    try {
        const pool = await getPool();
        const request = pool.request();

        let where = '';
        if (paciente_id) {
            request.input('paciente_id', sql.Int, Number(paciente_id));
            where = 'WHERE h.paciente_id = @paciente_id';
        } else if (buscar) {
            request.input('buscar', sql.VarChar(160), `%${buscar.trim()}%`);
            where = `WHERE p.numero_identidad LIKE @buscar OR CONCAT(p.nombres, ' ', p.apellidos) LIKE @buscar`;
        }

        const result = await request.query(`${SELECT_HISTORIA} ${where} ORDER BY h.fecha_consulta DESC`);
        return res.json(result.recordset);
    } catch (err) {
        console.error('Error listando historias clinicas:', err);
        return res.status(500).json({ message: 'Error al consultar historias clinicas' });
    }
}

async function obtenerHistoria(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, Number(req.params.id))
            .query(`${SELECT_HISTORIA} WHERE h.historia_id = @id`);

        const historia = result.recordset[0];
        if (!historia) {
            return res.status(404).json({ message: 'Historia clinica no encontrada' });
        }

        return res.json(historia);
    } catch (err) {
        console.error('Error obteniendo historia clinica:', err);
        return res.status(500).json({ message: 'Error al consultar la historia clinica' });
    }
}

async function obtenerHistoriaPorCita(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('cita_id', sql.Int, Number(req.params.citaId))
            .query(`${SELECT_HISTORIA} WHERE h.cita_id = @cita_id`);

        const historia = result.recordset[0];
        if (!historia) {
            return res.status(404).json({ message: 'Esta cita todavia no tiene historia clinica' });
        }

        return res.json(historia);
    } catch (err) {
        console.error('Error obteniendo historia clinica por cita:', err);
        return res.status(500).json({ message: 'Error al consultar la historia clinica' });
    }
}

async function crearHistoria(req, res) {
    const error = validarHistoria(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    const { paciente_id, cita_id, optometra_id, motivo_consulta } = req.body;

    try {
        const pool = await getPool();
        const rolId = Number(req.user?.rol_id);

        if (rolId !== 2) {
            return res.status(403).json({ message: 'Solo el optómetra puede gestionar consultas clínicas' });
        }

        if (cita_id) {
            const citaResult = await pool.request()
                .input('cita_id', sql.Int, Number(cita_id))
                .query('SELECT optometra_id, requiere_pago_previo, pago_verificado FROM Citas WHERE cita_id = @cita_id');

            if (citaResult.recordset.length > 0) {
                const cita = citaResult.recordset[0];
                if (Number(cita.optometra_id) !== Number(req.user?.empleado_id)) {
                    return res.status(403).json({ message: 'Solo puedes registrar consultas para tus citas asignadas' });
                }

                if (cita.requiere_pago_previo && !cita.pago_verificado) {
                    return res.status(400).json({ message: 'No se puede crear la consulta porque la cita requiere pago previo y este aún no se ha verificado.' });
                }
            }
        }

        const columnas = CAMPOS_CLINICOS.map(([campo]) => campo);
        const placeholders = columnas.map((campo) => `@${campo}`);

        const request = pool.request()
            .input('paciente_id', sql.Int, Number(paciente_id))
            .input('cita_id', sql.Int, cita_id ? Number(cita_id) : null)
            .input('optometra_id', sql.Int, Number(optometra_id))
            .input('motivo_consulta', sql.NVarChar(500), motivo_consulta);

        bindCamposClinicos(request, req.body);

        const result = await request.query(`INSERT INTO HistoriasClinicas
                (paciente_id, cita_id, optometra_id, fecha_consulta, bloqueada, motivo_consulta,
                 ${columnas.join(', ')}, creado_en, actualizado_en)
                OUTPUT INSERTED.historia_id
                VALUES
                (@paciente_id, @cita_id, @optometra_id, SYSUTCDATETIME(), 0, @motivo_consulta,
                 ${placeholders.join(', ')}, SYSUTCDATETIME(), SYSUTCDATETIME())`);

        const historia_id = result.recordset[0].historia_id;

        if (cita_id) {
            await pool.request()
                .input('cita_id', sql.Int, Number(cita_id))
                .query(`UPDATE Citas SET estado = 'Atendida' WHERE cita_id = @cita_id AND estado <> 'Cancelada'`);
        }

        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            accion: 'Crear historia clinica',
            registro_id: historia_id,
            detalle: `Paciente ${paciente_id}`,
            ip: req.ip,
        });

        return res.status(201).json({ message: 'Historia clinica registrada correctamente', historia_id });
    } catch (err) {
        console.error('Error creando historia clinica:', err);
        return res.status(500).json({ message: 'Error al registrar la historia clinica' });
    }
}

async function actualizarHistoria(req, res) {
    const error = validarHistoria(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    const id = Number(req.params.id);
    const { paciente_id, optometra_id, motivo_consulta } = req.body;

    try {
        const pool = await getPool();
        const rolId = Number(req.user?.rol_id);

        if (rolId !== 2) {
            return res.status(403).json({ message: 'Solo el optómetra puede gestionar consultas clínicas' });
        }

        const estadoActual = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT bloqueada, optometra_id FROM HistoriasClinicas WHERE historia_id = @id');

        if (estadoActual.recordset.length === 0) {
            return res.status(404).json({ message: 'Historia clinica no encontrada' });
        }

        if (estadoActual.recordset[0].bloqueada) {
            return res.status(403).json({ message: 'La historia clinica esta finalizada y no puede editarse' });
        }

        if (Number(estadoActual.recordset[0].optometra_id) !== Number(req.user?.empleado_id)) {
            return res.status(403).json({ message: 'Solo puedes editar tus propias consultas clínicas' });
        }

        const columnas = CAMPOS_CLINICOS.map(([campo]) => campo);
        const asignaciones = columnas.map((campo) => `${campo} = @${campo}`);

        const request = pool.request()
            .input('id', sql.Int, id)
            .input('paciente_id', sql.Int, Number(paciente_id))
            .input('optometra_id', sql.Int, Number(optometra_id))
            .input('motivo_consulta', sql.NVarChar(500), motivo_consulta);

        bindCamposClinicos(request, req.body);

        const result = await request.query(`UPDATE HistoriasClinicas
                SET paciente_id = @paciente_id,
                    optometra_id = @optometra_id,
                    motivo_consulta = @motivo_consulta,
                    ${asignaciones.join(', ')},
                    actualizado_en = SYSUTCDATETIME()
                WHERE historia_id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Historia clinica no encontrada' });
        }

        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            accion: 'Actualizar historia clinica',
            registro_id: id,
            detalle: `Paciente ${paciente_id}`,
            ip: req.ip,
        });

        return res.json({ message: 'Historia clinica actualizada correctamente' });
    } catch (err) {
        console.error('Error actualizando historia clinica:', err);
        return res.status(500).json({ message: 'Error al actualizar la historia clinica' });
    }
}

async function finalizarHistoria(req, res) {
    const id = Number(req.params.id);

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`UPDATE HistoriasClinicas
                    SET bloqueada = 1, bloqueada_en = SYSUTCDATETIME()
                    WHERE historia_id = @id AND bloqueada = 0`);

        if (result.rowsAffected[0] === 0) {
            return res.status(409).json({ message: 'La historia clinica no existe o ya estaba finalizada' });
        }

        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            accion: 'Finalizar historia clinica',
            registro_id: id,
            ip: req.ip,
        });

        return res.json({ message: 'Historia clinica finalizada y bloqueada correctamente' });
    } catch (err) {
        console.error('Error finalizando historia clinica:', err);
        return res.status(500).json({ message: 'Error al finalizar la historia clinica' });
    }
}

module.exports = {
    listarHistorias,
    obtenerHistoria,
    obtenerHistoriaPorCita,
    crearHistoria,
    actualizarHistoria,
    finalizarHistoria,
};