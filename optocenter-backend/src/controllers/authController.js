const { poolPromise, sql } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    const { usuario, password } = req.body;

    try {
        // 1. Obtener la conexión del pool
        const pool = await poolPromise;

        // 2. Ejecutar la consulta de forma segura con parámetros de SQL Server
        const result = await pool.request()
            .input('usuarioParam', sql.VarChar, usuario)
            .query('SELECT * FROM persona WHERE usuario = @usuarioParam');

        // En mssql, los registros se devuelven en la propiedad recordset
        if (result.recordset.length === 0) {
            return res.status(401).json({ msg: 'Usuario no existe' });
        }

        const user = result.recordset[0];

        // 3. Verificar la contraseña encriptada
      
        const isMatch = await bcrypt.compare(password, user.password);   
          encriptarPassword(password);
        if (!isMatch) {
            return res.status(401).json({ msg: 'contraseña incorrecta' });
        }

        // 4. Generar el Token JWT
        const token = jwt.sign(
            { id: user.id, rol: user.rol, nombre: user.nombre },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        // 5. Responder al cliente
        res.json({
            token,
            user: {
                nombre: user.nombre,
                usuario: user.usuario,
                rol: user.rol
            }
        });

    } catch (error) {
        console.error('Error en el controlador de auth:', error);
        res.status(500).json({ msg: 'Error interno en el servidor' });
    }
};

exports.register = async (req, res) => {
    const { usuario, password, nombre } = req.body;

    // Validación de campos
    if (!usuario || !password || !nombre) {
        return res.status(400).json({ msg: 'Por favor, ingrese todos los campos' });
    }

    try {
        const pool = await poolPromise;

        // 1. Verificar si el usuario ya existe
        const userCheck = await pool.request()
            .input('usuarioParam', sql.VarChar, usuario)
            .query('SELECT * FROM persona WHERE usuario = @usuarioParam');

        if (userCheck.recordset.length > 0) {
            return res.status(400).json({ msg: 'El usuario ya existe' });
        }

        // 2. Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Insertar el nuevo usuario en la base de datos (rol por defecto: 'user')
        const rolPorDefecto = 'cliente';
        await pool.request()
            .input('usuario', sql.VarChar, usuario)
            .input('password', sql.VarChar, passwordHash)
            .input('nombre', sql.VarChar, nombre)
            .input('rol', sql.VarChar, rolPorDefecto)
            .query('INSERT INTO persona (usuario, password, nombre, rol) VALUES (@usuario, @password, @nombre, @rol)');

        // 4. Obtener el usuario recién creado para retornar su info y generar token
        const result = await pool.request()
            .input('usuarioParam', sql.VarChar, usuario)
            .query('SELECT id, usuario, nombre, rol FROM persona WHERE usuario = @usuarioParam');

        const newUser = result.recordset[0];

        // 5. Generar token
        const token = jwt.sign(
            { id: newUser.id, rol: newUser.rol, nombre: newUser.nombre },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.json({
            token,
            user: {
                nombre: newUser.nombre,
                usuario: newUser.usuario,
                rol: newUser.rol
            }
        });

    } catch (error) {
        console.error('Error en el controlador de registro:', error);
        res.status(500).json({ msg: 'Error interno en el servidor' });
    }
};

{exports.paciente = async (req, res) => {
    // 1. Recibimos el objeto/modelo completo directamente desde el body
    const modeloPaciente = req.body; 

    // 2. Validación dinámica de campos obligatorios
    // Puedes quitar o agregar campos a esta lista según tus reglas de negocio
    const camposObligatorios = ['nombre', 'apellido', 'cedula', 'fechaNacimiento'];
    const camposFaltantes = camposObligatorios.filter(campo => !modeloPaciente[campo]);

    if (camposFaltantes.length > 0) {
        return res.status(400).json({ 
            msg: `Por favor, ingrese los campos obligatorios: ${camposFaltantes.join(', ')}` 
        });
    }

    try {
        const pool = await poolPromise;

        // 3. Verificar si el paciente ya está registrado (por ejemplo, mediante la cédula)
        const pacienteCheck = await pool.request()
            .input('cedulaParam', sql.VarChar, modeloPaciente.cedula)
            .query('SELECT id FROM persona WHERE cedula = @cedulaParam');

        if (pacienteCheck.recordset.length > 0) {
            return res.status(400).json({ msg: 'El paciente con esta cédula ya se encuentra registrado.' });
        }

        // 4. Insertar el nuevo paciente utilizando las propiedades del modelo JSON
        // Nota: Manejamos 'direccion' y 'celular' de forma segura por si el frontend no los envía (null)
        const result = await pool.request()
            .input('nombre', sql.VarChar, modeloPaciente.nombre)
            .input('apellido', sql.VarChar, modeloPaciente.apellido)
            .input('cedula', sql.VarChar, modeloPaciente.cedula)
            .input('fechaNacimiento', sql.Date, modeloPaciente.fechaNacimiento)
            .input('direccion', sql.VarChar, modeloPaciente.direccion || null)
            .input('celular', sql.VarChar, modeloPaciente.celular || null)
            .query(`
                INSERT INTO pacientes (nombre, apellido, cedula, fechaNac, direccion, celular) 
                OUTPUT INSERTED.id
                VALUES (@nombre, @apellido, @cedula, @fechaNacimiento, @direccion, @celular)
            `);

        // Obtener el ID generado por la base de datos
        const nuevoPacienteId = result.recordset[0].id;

        // 5. Respuesta exitosa retornando el modelo confirmado y su ID
        res.status(201).json({
            msg: 'Paciente registrado exitosamente',
            paciente: {
                id: nuevoPacienteId,
                ...modeloPaciente
            }
        });

    } catch (error) {
        console.error('Error al registrar el paciente:', error);
        res.status(500).json({ msg: 'Error interno en el servidor al guardar el paciente' });
    }
};}

async function encriptarPassword(passwordPlano) {
    // 1. Definir los "salt rounds" (costo de procesamiento, lo estándar es 10)
    const saltRounds = 10;
    
    // 2. Generar la encriptación
    const passwordEncriptado = await bcrypt.hash(passwordPlano, saltRounds);
    
    // 3. Ver el resultado en la consola
    console.log("Texto plano:", passwordPlano);
    console.log("Texto encriptado (Hash):", passwordEncriptado);
    
    return passwordEncriptado;
}

