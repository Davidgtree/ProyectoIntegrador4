const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../config/db');
const { verificarToken } = require('../middleware/authMiddleware');
const { sendMail } = require('../utils/mailer');

const MAX_INTENTOS_FALLIDOS = 3;

// Roles que se pueden auto-registrar desde el login.
// El Administrador (rol_id = 1) NUNCA se crea por autoregistro público.
const ROLES_PERMITIDOS_AUTOREGISTRO = [2, 3, 4]; // Optómetra, Cajero, Recepcion

async function registrarAuditoria(pool, { empleado_id, modulo, accion, detalle, ip }) {
    try {
        await pool.request()
            .input('empleado_id', sql.Int, empleado_id || null)
            .input('modulo', sql.VarChar(80), modulo)
            .input('accion', sql.VarChar(80), accion)
            .input('detalle', sql.NVarChar(sql.MAX), detalle || null)
            .input('ip_origen', sql.VarChar(45), ip || '0.0.0.0')
            .query(`INSERT INTO AuditoriaLog (empleado_id, modulo, accion, tabla_afectada, registro_id, detalle, ip_origen, fecha_hora)
                    VALUES (@empleado_id, @modulo, @accion, 'Empleados', @empleado_id, @detalle, @ip_origen, SYSUTCDATETIME())`);
    } catch (err) {
        console.error('No se pudo registrar auditoría:', err.message);
    }
}

async function login(req, res) {
    const { correo, password } = req.body;
    const ip = req.ip;

    if (!correo || !password) {
        return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
    }

    try {
        const pool = await getPool();

        const result = await pool.request()
            .input('correo', sql.VarChar(150), correo)
            .query(`SELECT empleado_id, rol_id, nombres, apellidos, correo, password_hash,
                            intentos_fallidos, bloqueado, activo
                     FROM Empleados
                     WHERE correo = @correo`);

        const empleado = result.recordset[0];

        if (!empleado) {
            await registrarAuditoria(pool, { modulo: 'Auth', accion: 'Login fallido (correo no existe)', detalle: correo, ip });
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        if (!empleado.activo) {
            return res.status(403).json({ message: 'Usuario inactivo. Contacta al administrador.' });
        }

        if (empleado.bloqueado) {
            await registrarAuditoria(pool, { empleado_id: empleado.empleado_id, modulo: 'Auth', accion: 'Login rechazado (cuenta bloqueada)', ip });
            return res.status(403).json({ message: 'Cuenta bloqueada por demasiados intentos fallidos. Contacta al administrador.' });
        }

        const passwordValida = await bcrypt.compare(password, empleado.password_hash);

        if (!passwordValida) {
            const nuevosIntentos = empleado.intentos_fallidos + 1;
            const seBloquea = nuevosIntentos >= MAX_INTENTOS_FALLIDOS;

            await pool.request()
                .input('id', sql.Int, empleado.empleado_id)
                .input('intentos', sql.TinyInt, nuevosIntentos)
                .input('bloqueado', sql.Bit, seBloquea)
                .query(`UPDATE Empleados
                        SET intentos_fallidos = @intentos, bloqueado = @bloqueado, actualizado_en = SYSUTCDATETIME()
                        WHERE empleado_id = @id`);

            await registrarAuditoria(pool, {
                empleado_id: empleado.empleado_id,
                modulo: 'Auth',
                accion: seBloquea ? 'Login fallido - cuenta bloqueada' : 'Login fallido (password incorrecta)',
                ip,
            });

            return res.status(401).json({
                message: seBloquea
                    ? 'Credenciales inválidas. Tu cuenta quedó bloqueada por demasiados intentos.'
                    : `Credenciales inválidas. Intento ${nuevosIntentos} de ${MAX_INTENTOS_FALLIDOS}.`,
            });
        }

        await pool.request()
            .input('id', sql.Int, empleado.empleado_id)
            .query(`UPDATE Empleados
                    SET intentos_fallidos = 0, ultimo_acceso = SYSUTCDATETIME(), actualizado_en = SYSUTCDATETIME()
                    WHERE empleado_id = @id`);

        await registrarAuditoria(pool, { empleado_id: empleado.empleado_id, modulo: 'Auth', accion: 'Login exitoso', ip });

        const token = jwt.sign(
            {
                empleado_id: empleado.empleado_id,
                rol_id: empleado.rol_id,
                correo: empleado.correo,
                nombre: `${empleado.nombres} ${empleado.apellidos}`,
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        return res.json({
            token,
            empleado: {
                id: empleado.empleado_id,
                nombre: `${empleado.nombres} ${empleado.apellidos}`,
                correo: empleado.correo,
                rol_id: empleado.rol_id,
            },
        });
    } catch (err) {
        console.error('Error en login:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

async function listarUsuarios(req, res) {
    if (Number(req.user?.rol_id) !== 1) {
        return res.status(403).json({ message: 'Solo el administrador puede ver usuarios' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request().query(`SELECT empleado_id, rol_id, nombres, apellidos, correo, telefono,
                                                        activo, bloqueado, ultimo_acceso, creado_en
                                                 FROM Empleados
                                                 WHERE rol_id <> 1
                                                 ORDER BY activo DESC, nombres, apellidos`);

        return res.json(result.recordset);
    } catch (err) {
        console.error('Error listando usuarios:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

async function cambiarEstadoUsuario(req, res) {
    if (Number(req.user?.rol_id) !== 1) {
        return res.status(403).json({ message: 'Solo el administrador puede modificar usuarios' });
    }

    const id = Number(req.params.id);
    const { activo } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    try {
        const pool = await getPool();
        const empleadoActual = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT rol_id FROM Empleados WHERE empleado_id = @id');

        if (empleadoActual.recordset.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (Number(empleadoActual.recordset[0].rol_id) === 1) {
            return res.status(403).json({ message: 'No se puede modificar al administrador principal' });
        }

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('activo', sql.Bit, Boolean(activo))
            .query(`UPDATE Empleados
                    SET activo = @activo, actualizado_en = SYSUTCDATETIME()
                    WHERE empleado_id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            modulo: 'Auth',
            accion: Boolean(activo) ? 'Activar usuario' : 'Inactivar usuario',
            detalle: `Empleado ${id}`,
            ip: req.ip,
        });

        return res.json({ message: Boolean(activo) ? 'Usuario activado correctamente' : 'Usuario inactivado correctamente' });
    } catch (err) {
        console.error('Error cambiando estado del usuario:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

async function actualizarUsuario(req, res) {
    if (Number(req.user?.rol_id) !== 1) {
        return res.status(403).json({ message: 'Solo el administrador puede modificar usuarios' });
    }

    const id = Number(req.params.id);
    const { nombres, apellidos, numero_identidad, correo, telefono, rol_id } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    if (!nombres || !apellidos || !numero_identidad || !correo || !rol_id) {
        return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    const rolNumerico = Number(rol_id);
    if (!ROLES_PERMITIDOS_AUTOREGISTRO.includes(rolNumerico)) {
        return res.status(400).json({ message: 'El rol seleccionado no es válido' });
    }

    try {
        const pool = await getPool();
        const empleadoActual = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT rol_id FROM Empleados WHERE empleado_id = @id');

        if (empleadoActual.recordset.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (Number(empleadoActual.recordset[0].rol_id) === 1) {
            return res.status(403).json({ message: 'No se puede modificar al administrador principal' });
        }

        const existing = await pool.request()
            .input('id', sql.Int, id)
            .input('correo', sql.VarChar(150), correo)
            .input('numero_identidad', sql.VarChar(20), numero_identidad)
            .query(`SELECT empleado_id FROM Empleados WHERE (correo = @correo OR numero_identidad = @numero_identidad) AND empleado_id <> @id`);

        if (existing.recordset.length > 0) {
            return res.status(409).json({ message: 'Correo o número de identidad ya está en uso por otro usuario' });
        }

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('rol_id', sql.Int, rolNumerico)
            .input('nombres', sql.VarChar(120), nombres)
            .input('apellidos', sql.VarChar(120), apellidos)
            .input('numero_identidad', sql.VarChar(20), numero_identidad)
            .input('correo', sql.VarChar(150), correo)
            .input('telefono', sql.VarChar(30), telefono || null)
            .query(`UPDATE Empleados
                    SET rol_id = @rol_id,
                        nombres = @nombres,
                        apellidos = @apellidos,
                        numero_identidad = @numero_identidad,
                        correo = @correo,
                        telefono = @telefono,
                        actualizado_en = SYSUTCDATETIME()
                    WHERE empleado_id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            modulo: 'Auth',
            accion: 'Actualizar usuario',
            detalle: `Empleado ${id}`,
            ip: req.ip,
        });

        return res.json({ message: 'Usuario actualizado correctamente' });
    } catch (err) {
        console.error('Error actualizando usuario:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

async function desbloquearUsuario(req, res) {
    if (Number(req.user?.rol_id) !== 1) {
        return res.status(403).json({ message: 'Solo el administrador puede desbloquear usuarios' });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    try {
        const pool = await getPool();
        const empleadoActual = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT rol_id, bloqueado FROM Empleados WHERE empleado_id = @id');

        if (empleadoActual.recordset.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (Number(empleadoActual.recordset[0].rol_id) === 1) {
            return res.status(403).json({ message: 'No se puede modificar al administrador principal' });
        }

        if (!empleadoActual.recordset[0].bloqueado) {
            return res.status(400).json({ message: 'El usuario no está bloqueado' });
        }

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('bloqueado', sql.Bit, 0)
            .input('intentos', sql.TinyInt, 0)
            .query(`UPDATE Empleados
                    SET bloqueado = @bloqueado, intentos_fallidos = @intentos, actualizado_en = SYSUTCDATETIME()
                    WHERE empleado_id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            modulo: 'Auth',
            accion: 'Desbloquear usuario',
            detalle: `Empleado ${id}`,
            ip: req.ip,
        });

        return res.json({ message: 'Usuario desbloqueado correctamente' });
    } catch (err) {
        console.error('Error desbloqueando usuario:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

async function crearUsuario(req, res) {
    if (Number(req.user?.rol_id) !== 1) {
        return res.status(403).json({ message: 'Solo el administrador puede crear usuarios' });
    }

    const { nombres, apellidos, numero_identidad, correo, telefono, password, rol_id } = req.body;

    if (!nombres || !apellidos || !numero_identidad || !correo || !password || !rol_id) {
        return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    const rolNumerico = Number(rol_id);
    if (!ROLES_PERMITIDOS_AUTOREGISTRO.includes(rolNumerico)) {
        return res.status(400).json({ message: 'El rol seleccionado no es válido para creación de personal' });
    }

    try {
        const pool = await getPool();
        const existing = await pool.request()
            .input('correo', sql.VarChar(150), correo)
            .input('numero_identidad', sql.VarChar(20), numero_identidad)
            .query(`SELECT empleado_id FROM Empleados WHERE correo = @correo OR numero_identidad = @numero_identidad`);

        if (existing.recordset.length > 0) {
            return res.status(409).json({ message: 'Correo o número de identidad ya registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        await pool.request()
            .input('rol_id', sql.Int, rolNumerico)
            .input('nombres', sql.VarChar(120), nombres)
            .input('apellidos', sql.VarChar(120), apellidos)
            .input('numero_identidad', sql.VarChar(20), numero_identidad)
            .input('correo', sql.VarChar(150), correo)
            .input('telefono', sql.VarChar(30), telefono || null)
            .input('password_hash', sql.VarChar(255), password_hash)
            .input('sal', sql.VarChar(255), salt)
            .input('activo', sql.Bit, 1)
            .input('bloqueado', sql.Bit, 0)
            .input('intentos_fallidos', sql.TinyInt, 0)
            .query(`INSERT INTO Empleados (rol_id, nombres, apellidos, numero_identidad, correo, telefono, password_hash, sal, activo, bloqueado, intentos_fallidos, creado_en, actualizado_en)
                    VALUES (@rol_id, @nombres, @apellidos, @numero_identidad, @correo, @telefono, @password_hash, @sal, @activo, @bloqueado, @intentos_fallidos, SYSUTCDATETIME(), SYSUTCDATETIME())`);

        await registrarAuditoria(pool, {
            empleado_id: req.user?.empleado_id,
            modulo: 'Auth',
            accion: 'Crear usuario',
            detalle: `Empleado ${correo}`,
            ip: req.ip,
        });

        return res.status(201).json({ message: 'Usuario creado correctamente' });
    } catch (err) {
        console.error('Error creando usuario:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

async function recuperarPassword(req, res) {
    const { correo } = req.body;

    if (!correo) {
        return res.status(400).json({ message: 'El correo es requerido' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('correo', sql.VarChar(150), correo)
            .query(`SELECT empleado_id, nombres, apellidos, correo, activo
                    FROM Empleados
                    WHERE correo = @correo`);

        const empleado = result.recordset[0];

        if (empleado && empleado.activo) {
            const resetToken = jwt.sign(
                { empleado_id: empleado.empleado_id, prop: 'password-reset' },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

            await pool.request()
                .input('id', sql.Int, empleado.empleado_id)
                .input('token', sql.NVarChar(255), resetToken)
                .input('expira', sql.DateTime2, expiresAt)
                .query(`UPDATE Empleados
                        SET token_recuperacion = @token,
                            token_expira_en = @expira,
                            actualizado_en = SYSUTCDATETIME()
                        WHERE empleado_id = @id`);

            const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/restablecer-password?token=${resetToken}`;
            const emailBody = `Hola ${empleado.nombres} ${empleado.apellidos},\n\nSolicitaste recuperar tu contraseña en OptoCenter.\nUsa este enlace para crear una nueva contraseña:\n${resetLink}\n\nEl enlace vence en 1 hora.`;

            try {
                if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                    await sendMail({
                        from: process.env.EMAIL_FROM || 'no-reply@optocenter.com',
                        to: empleado.correo,
                        subject: 'Recuperación de contraseña - OptoCenter',
                        text: emailBody,
                        html: `<p>Hola ${empleado.nombres} ${empleado.apellidos},</p><p>Solicitaste recuperar tu contraseña en OptoCenter.</p><p><a href="${resetLink}">Restablecer contraseña</a></p><p>El enlace vence en 1 hora.</p>`,
                    });
                }
            } catch (mailError) {
                console.error('Error enviando correo de recuperación:', mailError);
            }
        }

        return res.json({
            message: 'Si el correo está registrado y activo, recibirás instrucciones para recuperar tu contraseña.',
        });
    } catch (err) {
        console.error('Error en recuperación de contraseña:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

async function validarTokenRecuperacion(req, res) {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'Token requerido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, decoded.empleado_id)
            .input('token', sql.NVarChar(255), token)
            .query(`SELECT empleado_id, token_recuperacion, token_expira_en
                FROM Empleados
                WHERE empleado_id = @id`);

        const empleado = result.recordset[0];

        if (!empleado) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const expirado = !empleado.token_expira_en || new Date(empleado.token_expira_en) < new Date();
        const tokenValido = empleado.token_recuperacion === token && !expirado;

        if (!tokenValido) {
            return res.status(401).json({ message: 'El token de recuperación ha expirado o es inválido' });
        }

        return res.json({ message: 'Token válido', empleado_id: empleado.empleado_id });
    } catch (err) {
        console.error('Error validando token:', err);
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
}

async function restablecerPassword(req, res) {
    const { token, nuevaPassword } = req.body;

    if (!token || !nuevaPassword) {
        return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });
    }

    if (String(nuevaPassword).length < 6) {
        return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, decoded.empleado_id)
            .input('token', sql.NVarChar(255), token)
            .query(`SELECT empleado_id, token_recuperacion, token_expira_en
                FROM Empleados
                WHERE empleado_id = @id`);

        const empleado = result.recordset[0];

        if (!empleado) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const expirado = !empleado.token_expira_en || new Date(empleado.token_expira_en) < new Date();
        const tokenValido = empleado.token_recuperacion === token && !expirado;

        if (!tokenValido) {
            return res.status(401).json({ message: 'El token de recuperación ha expirado o es inválido' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(nuevaPassword, salt);

        await pool.request()
            .input('id', sql.Int, empleado.empleado_id)
            .input('password_hash', sql.VarChar(255), password_hash)
            .input('salt', sql.VarChar(255), salt)
            .input('token', sql.NVarChar(255), null)
            .input('expira', sql.DateTime2, null)
            .query(`UPDATE Empleados
                    SET password_hash = @password_hash,
                        sal = @salt,
                        token_recuperacion = @token,
                        token_expira_en = @expira,
                        intentos_fallidos = 0,
                        bloqueado = 0,
                        actualizado_en = SYSUTCDATETIME()
                    WHERE empleado_id = @id`);

        return res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (err) {
        console.error('Error restableciendo contraseña:', err);
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
}

async function register(req, res) {
    const { nombres, apellidos, numero_identidad, correo, telefono, password, rol_id } = req.body;
    const ip = req.ip;

    if (!nombres || !apellidos || !numero_identidad || !correo || !password || !rol_id) {
        return res.status(400).json({ message: 'Todos los campos son requeridos (nombres, apellidos, número de identidad, correo, contraseña y rol)' });
    }

    if (!ROLES_PERMITIDOS_AUTOREGISTRO.includes(Number(rol_id))) {
        return res.status(403).json({ message: 'El rol seleccionado no está permitido para autoregistro' });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
        const pool = await getPool();

        const existe = await pool.request()
            .input('correo', sql.VarChar(150), correo)
            .input('numero_identidad', sql.VarChar(20), numero_identidad)
            .query(`SELECT empleado_id FROM Empleados WHERE correo = @correo OR numero_identidad = @numero_identidad`);

        if (existe.recordset.length > 0) {
            return res.status(409).json({ message: 'Ya existe un empleado registrado con ese correo o número de identidad' });
        }

        const hash = await bcrypt.hash(password, 10);

        const insertResult = await pool.request()
            .input('rol_id', sql.Int, rol_id)
            .input('nombres', sql.VarChar(100), nombres)
            .input('apellidos', sql.VarChar(100), apellidos)
            .input('numero_identidad', sql.VarChar(20), numero_identidad)
            .input('correo', sql.VarChar(150), correo)
            .input('telefono', sql.VarChar(20), telefono || null)
            .input('password_hash', sql.VarChar(256), hash)
            .input('sal', sql.VarChar(64), 'n-a-bcrypt')
            .query(`INSERT INTO Empleados
                (rol_id, nombres, apellidos, numero_identidad, correo, telefono, password_hash, sal,
                 intentos_fallidos, bloqueado, activo, creado_en, actualizado_en)
                OUTPUT INSERTED.empleado_id
                VALUES (@rol_id, @nombres, @apellidos, @numero_identidad, @correo, @telefono, @password_hash, @sal,
                        0, 0, 1, SYSUTCDATETIME(), SYSUTCDATETIME())`);

        const empleado_id = insertResult.recordset[0].empleado_id;

        await registrarAuditoria(pool, { empleado_id, modulo: 'Auth', accion: 'Registro de nuevo empleado', ip });

        const token = jwt.sign(
            { empleado_id, rol_id: Number(rol_id), correo, nombre: `${nombres} ${apellidos}` },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        return res.status(201).json({
            token,
            empleado: { id: empleado_id, nombre: `${nombres} ${apellidos}`, correo, rol_id: Number(rol_id) },
        });
    } catch (err) {
        console.error('Error en registro:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

module.exports = { login, register, recuperarPassword, validarTokenRecuperacion, restablecerPassword, listarUsuarios, crearUsuario, cambiarEstadoUsuario, desbloquearUsuario, actualizarUsuario, verificarToken };