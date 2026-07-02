const { sql, getPool } = require('../config/db');
const { sendMail } = require('../utils/mailer');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function registrarAuditoria(pool, { empleado_id, accion, detalle, ip, registro_id }) {
    try {
        await pool.request()
            .input('empleado_id', sql.Int, empleado_id || null)
            .input('accion', sql.VarChar(80), accion)
            .input('detalle', sql.NVarChar(sql.MAX), detalle || null)
            .input('registro_id', sql.Int, registro_id || null)
            .input('ip_origen', sql.VarChar(45), ip || '0.0.0.0')
            .query(`INSERT INTO AuditoriaLog (empleado_id, modulo, accion, tabla_afectada, registro_id, detalle, ip_origen, fecha_hora)
                    VALUES (@empleado_id, 'Citas', @accion, 'Citas', @registro_id, @detalle, @ip_origen, SYSUTCDATETIME())`);
    } catch (err) {
        console.error('No se pudo registrar auditoria de citas:', err.message);
    }
}

function validarCita(data) {
    const requeridos = ['paciente_id', 'optometra_id', 'fecha_hora_inicio', 'fecha_hora_fin'];
    const faltantes = requeridos.filter((campo) => !String(data[campo] || '').trim());

    if (faltantes.length > 0) {
        return `Campos requeridos faltantes: ${faltantes.join(', ')}`;
    }

    const inicio = new Date(data.fecha_hora_inicio);
    const fin = new Date(data.fecha_hora_fin);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
        return 'Fechas de cita invalidas';
    }

    if (fin <= inicio) {
        return 'La hora de fin debe ser posterior a la hora de inicio';
    }

    return null;
}

async function listarCitas(req, res) {
    const { fecha = '', buscar = '' } = req.query;
    const termino = `%${buscar.trim()}%`;

    try {
        const pool = await getPool();
        const request = pool.request()
            .input('buscar', sql.VarChar(160), termino)
            .input('fecha', sql.Date, fecha || null);

        const result = await request.query(`SELECT TOP (150)
                        c.cita_id, c.paciente_id, c.optometra_id, c.estado,
                        c.fecha_hora_inicio, c.fecha_hora_fin, c.motivo,
                        c.requiere_pago_previo, c.pago_verificado,
                        c.notas_cancelacion, c.reprogramada_desde, c.creado_en,
                        CONCAT(p.nombres, ' ', p.apellidos) AS paciente_nombre,
                        p.numero_identidad AS paciente_identidad,
                        CONCAT(e.nombres, ' ', e.apellidos) AS optometra_nombre
                    FROM Citas c
                    INNER JOIN Pacientes p ON p.paciente_id = c.paciente_id
                    INNER JOIN Empleados e ON e.empleado_id = c.optometra_id
                    WHERE (@fecha IS NULL OR CAST(c.fecha_hora_inicio AS date) = @fecha)
                      AND (@buscar = '%%'
                           OR p.numero_identidad LIKE @buscar
                           OR p.nombres LIKE @buscar
                           OR p.apellidos LIKE @buscar
                           OR e.nombres LIKE @buscar
                           OR e.apellidos LIKE @buscar
                           OR c.estado LIKE @buscar)
                    ORDER BY c.fecha_hora_inicio DESC`);

        return res.json(result.recordset);
    } catch (err) {
        console.error('Error listando citas:', err);
        return res.status(500).json({ message: 'Error al consultar citas' });
    }
}

async function obtenerOpciones(req, res) {
    try {
        const pool = await getPool();
        const [pacientes, optometras] = await Promise.all([
            pool.request().query(`SELECT TOP (200) paciente_id, numero_identidad, nombres, apellidos
                                  FROM Pacientes
                                  ORDER BY actualizado_en DESC, paciente_id DESC`),
            pool.request().query(`SELECT empleado_id, nombres, apellidos, correo
                                  FROM Empleados
                                  WHERE rol_id = 2 AND activo = 1
                                  ORDER BY nombres, apellidos`),
        ]);

        return res.json({
            pacientes: pacientes.recordset,
            optometras: optometras.recordset,
        });
    } catch (err) {
        console.error('Error consultando opciones de citas:', err);
        return res.status(500).json({ message: 'Error al consultar opciones de citas' });
    }
}

async function crearCita(req, res) {
    const error = validarCita(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    const {
        paciente_id,
        optometra_id,
        fecha_hora_inicio,
        fecha_hora_fin,
        motivo,
        requiere_pago_previo,
    } = req.body;

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('paciente_id', sql.Int, Number(paciente_id))
            .input('optometra_id', sql.Int, Number(optometra_id))
            .input('fecha_hora_inicio', sql.DateTime2, new Date(fecha_hora_inicio))
            .input('fecha_hora_fin', sql.DateTime2, new Date(fecha_hora_fin))
            .input('motivo', sql.VarChar(300), motivo || null)
            .input('requiere_pago_previo', sql.Bit, Boolean(requiere_pago_previo))
            .input('creado_por', sql.Int, req.user?.empleado_id || null)
            .query(`INSERT INTO Citas
                    (paciente_id, optometra_id, estado, fecha_hora_inicio, fecha_hora_fin, motivo,
                     requiere_pago_previo, pago_verificado, creado_en, creado_por)
                    OUTPUT INSERTED.cita_id
                    VALUES
                    (@paciente_id, @optometra_id, 'Agendada', @fecha_hora_inicio, @fecha_hora_fin, @motivo,
                     @requiere_pago_previo, 0, SYSUTCDATETIME(), @creado_por)`);

        const cita_id = result.recordset[0].cita_id;
        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            accion: 'Crear cita',
            registro_id: cita_id,
            detalle: `Paciente ${paciente_id}`,
            ip: req.ip,
        });

        if (Boolean(requiere_pago_previo)) {
            try {
                const correoResult = await pool.request()
                    .input('paciente_id', sql.Int, Number(paciente_id))
                    .query('SELECT nombres, apellidos, correo FROM Pacientes WHERE paciente_id = @paciente_id');

                if (correoResult.recordset.length > 0) {
                    const paciente = correoResult.recordset[0];
                    if (paciente.correo) {
                        const titulo = 'Confirmación de pago de cita Optocenter';
                        const linkConfirmacion = `${APP_URL}/api/citas/${cita_id}/confirmar-pago`;
                        const html = `
                            <p>Hola ${paciente.nombres} ${paciente.apellidos},</p>
                            <p>Su cita ha sido agendada y requiere pago previo.</p>
                            <p>Por favor confirme su pago haciendo clic en el siguiente enlace:</p>
                            <p><a href="${linkConfirmacion}">Confirmar pago de cita</a></p>
                            <p>Si no realizó esta solicitud, por favor ignore este mensaje.</p>
                        `;

                        await sendMail({
                            from: process.env.EMAIL_FROM,
                            to: paciente.correo,
                            subject: titulo,
                            html,
                        });
                    }
                }
            } catch (emailErr) {
                console.error('No se pudo enviar correo de confirmación de pago:', emailErr.message);
            }
        }

        return res.status(201).json({ message: 'Cita agendada correctamente', cita_id });
    } catch (err) {
        console.error('Error creando cita:', err);
        return res.status(500).json({ message: 'Error al agendar cita' });
    }
}

async function actualizarCita(req, res) {
    const error = validarCita(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    const id = Number(req.params.id);
    const {
        paciente_id,
        optometra_id,
        fecha_hora_inicio,
        fecha_hora_fin,
        motivo,
        requiere_pago_previo,
    } = req.body;

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('paciente_id', sql.Int, Number(paciente_id))
            .input('optometra_id', sql.Int, Number(optometra_id))
            .input('fecha_hora_inicio', sql.DateTime2, new Date(fecha_hora_inicio))
            .input('fecha_hora_fin', sql.DateTime2, new Date(fecha_hora_fin))
            .input('motivo', sql.VarChar(300), motivo || null)
            .input('requiere_pago_previo', sql.Bit, Boolean(requiere_pago_previo))
            .query(`UPDATE Citas
                    SET paciente_id = @paciente_id,
                        optometra_id = @optometra_id,
                        estado = CASE WHEN estado = 'Cancelada' THEN estado ELSE 'Reprogramada' END,
                        fecha_hora_inicio = @fecha_hora_inicio,
                        fecha_hora_fin = @fecha_hora_fin,
                        motivo = @motivo,
                        requiere_pago_previo = @requiere_pago_previo
                    WHERE cita_id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            accion: 'Reprogramar cita',
            registro_id: id,
            detalle: `Paciente ${paciente_id}`,
            ip: req.ip,
        });

        return res.json({ message: 'Cita actualizada correctamente' });
    } catch (err) {
        console.error('Error actualizando cita:', err);
        return res.status(500).json({ message: 'Error al actualizar cita' });
    }
}

async function cancelarCita(req, res) {
    const id = Number(req.params.id);
    const { notas_cancelacion } = req.body;

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('notas_cancelacion', sql.VarChar(500), notas_cancelacion || null)
            .query(`UPDATE Citas
                    SET estado = 'Cancelada',
                        notas_cancelacion = @notas_cancelacion
                    WHERE cita_id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            accion: 'Cancelar cita',
            registro_id: id,
            detalle: notas_cancelacion || null,
            ip: req.ip,
        });

        return res.json({ message: 'Cita cancelada correctamente' });
    } catch (err) {
        console.error('Error cancelando cita:', err);
        return res.status(500).json({ message: 'Error al cancelar cita' });
    }
}

async function verificarPagoCita(req, res) {
    const id = Number(req.params.id);

    try {
        const pool = await getPool();
        const citaResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT requiere_pago_previo, pago_verificado FROM Citas WHERE cita_id = @id');

        if (citaResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        const cita = citaResult.recordset[0];
        if (!cita.requiere_pago_previo) {
            return res.status(400).json({ message: 'Esta cita no requiere pago previo' });
        }

        if (cita.pago_verificado) {
            return res.status(400).json({ message: 'El pago ya fue verificado' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE Citas SET pago_verificado = 1 WHERE cita_id = @id');

        return res.json({ message: 'Pago verificado correctamente' });
    } catch (err) {
        console.error('Error verificando pago de cita:', err);
        return res.status(500).json({ message: 'Error al verificar el pago de la cita' });
    }
}

async function confirmarPagoCita(req, res) {
    const id = Number(req.params.id);

    try {
        const pool = await getPool();
        const citaResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT requiere_pago_previo, pago_verificado FROM Citas WHERE cita_id = @id');

        if (citaResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        const cita = citaResult.recordset[0];
        if (!cita.requiere_pago_previo) {
            return res.status(400).json({ message: 'Esta cita no requiere pago previo' });
        }

        if (cita.pago_verificado) {
            return res.status(400).json({ message: 'El pago ya había sido confirmado' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE Citas SET pago_verificado = 1 WHERE cita_id = @id');

        return res.json({ message: 'Pago confirmado desde el correo correctamente' });
    } catch (err) {
        console.error('Error confirmando pago de cita:', err);
        return res.status(500).json({ message: 'Error al confirmar el pago de la cita' });
    }
}

module.exports = {
    listarCitas,
    obtenerOpciones,
    crearCita,
    actualizarCita,
    cancelarCita,
    verificarPagoCita,
    confirmarPagoCita,
};
