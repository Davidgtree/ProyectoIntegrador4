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
                    VALUES (@empleado_id, 'Pacientes', @accion, 'Pacientes', @registro_id, @detalle, @ip_origen, SYSUTCDATETIME())`);
    } catch (err) {
        console.error('No se pudo registrar auditoria de pacientes:', err.message);
    }
}

function validarPaciente(data) {
    const requeridos = ['numero_identidad', 'nombres', 'apellidos', 'fecha_nacimiento', 'genero'];
    const faltantes = requeridos.filter((campo) => !String(data[campo] || '').trim());

    if (faltantes.length > 0) {
        return `Campos requeridos faltantes: ${faltantes.join(', ')}`;
    }

    if (!['M', 'F', 'O'].includes(String(data.genero).toUpperCase())) {
        return 'Genero invalido. Usa M, F u O.';
    }

    return null;
}

function getRoleAccessPolicy(rolId) {
    const numericRoleId = Number(rolId);

    if (numericRoleId === 1) {
        return {
            canRead: true,
            canCreate: true,
            canEdit: true,
            canToggleActive: true,
            canViewInactive: true,
            readOnly: false,
            mode: 'admin',
        };
    }

    if (numericRoleId === 4) {
        return {
            canRead: true,
            canCreate: true,
            canEdit: true,
            canToggleActive: false,
            canViewInactive: false,
            readOnly: false,
            mode: 'reception',
        };
    }

    if (numericRoleId === 2) {
        return {
            canRead: true,
            canCreate: false,
            canEdit: false,
            canToggleActive: false,
            canViewInactive: false,
            readOnly: true,
            mode: 'readOnly',
        };
    }

    return {
        canRead: true,
        canCreate: false,
        canEdit: false,
        canToggleActive: false,
        canViewInactive: false,
        readOnly: true,
        mode: 'readOnly',
    };
}

async function asegurarColumnaActivo(pool) {
    try {
        const check = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Pacientes' AND COLUMN_NAME = 'activo'
        `);

        if (check.recordset.length > 0) {
            return true;
        }

        await pool.request().query(`
            ALTER TABLE Pacientes
            ADD activo BIT NOT NULL CONSTRAINT DF_Pacientes_activo DEFAULT (1)
        `);
        return true;
    } catch (err) {
        console.error('No se pudo asegurar la columna activo en Pacientes:', err.message);
        return false;
    }
}

function buildPacienteSelectColumns(includeActivoColumn) {
    const activoColumn = includeActivoColumn ? ', activo' : '';

    return `paciente_id, numero_identidad, nombres, apellidos, fecha_nacimiento, genero,
                        direccion, telefono, correo, contacto_emergencia_nombre,
                        contacto_emergencia_telefono, credito_bloqueado${activoColumn}, creado_en, actualizado_en,
                        DATEDIFF(YEAR, fecha_nacimiento, CAST(GETDATE() AS date))
                          - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, fecha_nacimiento, CAST(GETDATE() AS date)), fecha_nacimiento) > CAST(GETDATE() AS date)
                            THEN 1 ELSE 0 END AS edad`;
}

function mapPaciente(row) {
    return {
        paciente_id: row.paciente_id,
        numero_identidad: row.numero_identidad,
        nombres: row.nombres,
        apellidos: row.apellidos,
        fecha_nacimiento: row.fecha_nacimiento,
        genero: row.genero,
        direccion: row.direccion,
        telefono: row.telefono,
        correo: row.correo,
        contacto_emergencia_nombre: row.contacto_emergencia_nombre,
        contacto_emergencia_telefono: row.contacto_emergencia_telefono,
        credito_bloqueado: row.credito_bloqueado,
        activo: row.activo === undefined ? true : Boolean(row.activo),
        edad: row.edad,
        creado_en: row.creado_en,
        actualizado_en: row.actualizado_en,
    };
}

async function listarPacientes(req, res) {
    const { buscar = '' } = req.query;
    const termino = `%${buscar.trim()}%`;

    try {
        const pool = await getPool();
        const tieneColumnaActivo = await asegurarColumnaActivo(pool);

        const policy = getRoleAccessPolicy(req.user?.rol_id);
        if (!policy.canRead) {
            return res.status(403).json({ message: 'No tienes permisos para ver pacientes' });
        }

        const filtroActivo = policy.canViewInactive || !tieneColumnaActivo ? '' : ' AND activo = 1';
        const result = await pool.request()
            .input('buscar', sql.VarChar(160), termino)
            .query(`SELECT TOP (100)
                        ${buildPacienteSelectColumns(tieneColumnaActivo)}
                    FROM Pacientes
                    WHERE (@buscar = '%%'
                       OR numero_identidad LIKE @buscar
                       OR nombres LIKE @buscar
                       OR apellidos LIKE @buscar
                       OR telefono LIKE @buscar
                       OR correo LIKE @buscar)
                      ${filtroActivo}
                    ORDER BY actualizado_en DESC, paciente_id DESC`);

        return res.json(result.recordset.map(mapPaciente));
    } catch (err) {
        console.error('Error listando pacientes:', err);
        return res.status(500).json({ message: 'Error al consultar pacientes' });
    }
}

async function obtenerPaciente(req, res) {
    try {
        const pool = await getPool();
        const tieneColumnaActivo = await asegurarColumnaActivo(pool);

        const policy = getRoleAccessPolicy(req.user?.rol_id);
        if (!policy.canRead) {
            return res.status(403).json({ message: 'No tienes permisos para ver pacientes' });
        }

        const result = await pool.request()
            .input('id', sql.Int, Number(req.params.id))
            .query(`SELECT
                        ${buildPacienteSelectColumns(tieneColumnaActivo)}
                    FROM Pacientes
                    WHERE paciente_id = @id`);

        const paciente = result.recordset[0];
        if (!paciente) {
            return res.status(404).json({ message: 'Paciente no encontrado' });
        }

        if (!policy.canViewInactive && tieneColumnaActivo && paciente.activo === 0) {
            return res.status(404).json({ message: 'Paciente no encontrado' });
        }

        return res.json(mapPaciente(paciente));
    } catch (err) {
        console.error('Error obteniendo paciente:', err);
        return res.status(500).json({ message: 'Error al consultar el paciente' });
    }
}

async function crearPaciente(req, res) {
    const error = validarPaciente(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    const policy = getRoleAccessPolicy(req.user?.rol_id);
    if (!policy.canCreate) {
        return res.status(403).json({ message: 'No tienes permisos para crear pacientes' });
    }

    const {
        numero_identidad,
        nombres,
        apellidos,
        fecha_nacimiento,
        genero,
        direccion,
        telefono,
        correo,
        contacto_emergencia_nombre,
        contacto_emergencia_telefono,
    } = req.body;

    try {
        const pool = await getPool();
        const tieneColumnaActivo = await asegurarColumnaActivo(pool);

        const existe = await pool.request()
            .input('numero_identidad', sql.VarChar(20), numero_identidad)
            .query('SELECT paciente_id FROM Pacientes WHERE numero_identidad = @numero_identidad');

        if (existe.recordset.length > 0) {
            return res.status(409).json({ message: 'Ya existe un paciente con ese numero de identidad' });
        }

        const request = pool.request()
            .input('numero_identidad', sql.VarChar(20), numero_identidad)
            .input('nombres', sql.VarChar(100), nombres)
            .input('apellidos', sql.VarChar(100), apellidos)
            .input('fecha_nacimiento', sql.Date, fecha_nacimiento)
            .input('genero', sql.Char(1), String(genero).toUpperCase())
            .input('direccion', sql.VarChar(300), direccion || null)
            .input('telefono', sql.VarChar(20), telefono || null)
            .input('correo', sql.VarChar(150), correo || null)
            .input('contacto_emergencia_nombre', sql.VarChar(200), contacto_emergencia_nombre || null)
            .input('contacto_emergencia_telefono', sql.VarChar(20), contacto_emergencia_telefono || null);

        if (tieneColumnaActivo) {
            request.input('activo', sql.Bit, 1);
        }

        const result = await request.query(`INSERT INTO Pacientes
                    (numero_identidad, nombres, apellidos, fecha_nacimiento, genero, direccion, telefono, correo,
                     contacto_emergencia_nombre, contacto_emergencia_telefono, credito_bloqueado${tieneColumnaActivo ? ', activo' : ''},
                     creado_en, actualizado_en)
                    OUTPUT INSERTED.paciente_id
                    VALUES
                    (@numero_identidad, @nombres, @apellidos, @fecha_nacimiento, @genero, @direccion, @telefono, @correo,
                     @contacto_emergencia_nombre, @contacto_emergencia_telefono, 0${tieneColumnaActivo ? ', @activo' : ''},
                     SYSUTCDATETIME(), SYSUTCDATETIME())`);

        const paciente_id = result.recordset[0].paciente_id;
        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            accion: 'Crear paciente',
            registro_id: paciente_id,
            detalle: numero_identidad,
            ip: req.ip,
        });

        return res.status(201).json({ message: 'Paciente registrado correctamente', paciente_id });
    } catch (err) {
        console.error('Error creando paciente:', err);
        return res.status(500).json({ message: 'Error al registrar paciente' });
    }
}

async function actualizarPaciente(req, res) {
    const error = validarPaciente(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    const policy = getRoleAccessPolicy(req.user?.rol_id);
    if (!policy.canEdit) {
        return res.status(403).json({ message: 'No tienes permisos para editar pacientes' });
    }

    const id = Number(req.params.id);
    const {
        numero_identidad,
        nombres,
        apellidos,
        fecha_nacimiento,
        genero,
        direccion,
        telefono,
        correo,
        contacto_emergencia_nombre,
        contacto_emergencia_telefono,
    } = req.body;

    try {
        const pool = await getPool();
        await asegurarColumnaActivo(pool);

        const existe = await pool.request()
            .input('id', sql.Int, id)
            .input('numero_identidad', sql.VarChar(20), numero_identidad)
            .query(`SELECT paciente_id
                    FROM Pacientes
                    WHERE numero_identidad = @numero_identidad AND paciente_id <> @id`);

        if (existe.recordset.length > 0) {
            return res.status(409).json({ message: 'Ya existe otro paciente con ese numero de identidad' });
        }

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('numero_identidad', sql.VarChar(20), numero_identidad)
            .input('nombres', sql.VarChar(100), nombres)
            .input('apellidos', sql.VarChar(100), apellidos)
            .input('fecha_nacimiento', sql.Date, fecha_nacimiento)
            .input('genero', sql.Char(1), String(genero).toUpperCase())
            .input('direccion', sql.VarChar(300), direccion || null)
            .input('telefono', sql.VarChar(20), telefono || null)
            .input('correo', sql.VarChar(150), correo || null)
            .input('contacto_emergencia_nombre', sql.VarChar(200), contacto_emergencia_nombre || null)
            .input('contacto_emergencia_telefono', sql.VarChar(20), contacto_emergencia_telefono || null)
            .query(`UPDATE Pacientes
                    SET numero_identidad = @numero_identidad,
                        nombres = @nombres,
                        apellidos = @apellidos,
                        fecha_nacimiento = @fecha_nacimiento,
                        genero = @genero,
                        direccion = @direccion,
                        telefono = @telefono,
                        correo = @correo,
                        contacto_emergencia_nombre = @contacto_emergencia_nombre,
                        contacto_emergencia_telefono = @contacto_emergencia_telefono,
                        actualizado_en = SYSUTCDATETIME()
                    WHERE paciente_id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Paciente no encontrado' });
        }

        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            accion: 'Actualizar paciente',
            registro_id: id,
            detalle: numero_identidad,
            ip: req.ip,
        });

        return res.json({ message: 'Paciente actualizado correctamente' });
    } catch (err) {
        console.error('Error actualizando paciente:', err);
        return res.status(500).json({ message: 'Error al actualizar paciente' });
    }
}

async function cambiarEstadoPaciente(req, res) {
    const policy = getRoleAccessPolicy(req.user?.rol_id);
    if (!policy.canToggleActive) {
        return res.status(403).json({ message: 'No tienes permisos para cambiar el estado del paciente' });
    }

    const id = Number(req.params.id);
    const { activo } = req.body;

    if (activo === undefined) {
        return res.status(400).json({ message: 'El estado es requerido' });
    }

    try {
        const pool = await getPool();
        const tieneColumnaActivo = await asegurarColumnaActivo(pool);

        if (!tieneColumnaActivo) {
            return res.status(400).json({ message: 'No se puede cambiar el estado porque la base de datos no tiene la columna activo habilitada.' });
        }

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('activo', sql.Bit, Boolean(activo))
            .query(`UPDATE Pacientes
                    SET activo = @activo,
                        actualizado_en = SYSUTCDATETIME()
                    WHERE paciente_id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Paciente no encontrado' });
        }

        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            accion: Boolean(activo) ? 'Activar paciente' : 'Inactivar paciente',
            registro_id: id,
            detalle: 'Cambio de estado',
            ip: req.ip,
        });

        return res.json({ message: Boolean(activo) ? 'Paciente activado correctamente' : 'Paciente inactivado correctamente' });
    } catch (err) {
        console.error('Error cambiando estado del paciente:', err);
        return res.status(500).json({ message: 'Error al cambiar el estado del paciente' });
    }
}

module.exports = {
    listarPacientes,
    obtenerPaciente,
    crearPaciente,
    actualizarPaciente,
    cambiarEstadoPaciente,
};
