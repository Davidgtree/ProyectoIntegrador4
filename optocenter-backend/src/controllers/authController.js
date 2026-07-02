const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../config/db');

const MAX_INTENTOS_FALLIDOS = 3;

// Roles que se pueden auto-registrar desde el login.
// El Administrador (rol_id = 1) NUNCA se crea por autoregistro público.
const ROLES_PERMITIDOS_AUTOREGISTRO = [2, 3, 4]; // Optómetra, Cajero, Vendedor

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

module.exports = { login, register };