// Ejecutar UNA vez con: node seed-admin.js
// Crea un usuario administrador de prueba en la tabla Empleados.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('./src/config/db');

// 👉 Cambia estos datos si quieres
const datosAdmin = {
    rol_id: 1, // 1 = Administrador (ya viene sembrado en la tabla Roles)
    nombres: 'Admin',
    apellidos: 'Sistema',
    numero_identidad: '0000000000',
    correo: 'admin@optocenter.com',
    telefono: null,
    passwordPlano: 'Admin123!',
};

async function seed() {
    const hash = await bcrypt.hash(datosAdmin.passwordPlano, 10);
    const pool = await getPool();

    await pool.request()
        .input('rol_id', sql.Int, datosAdmin.rol_id)
        .input('nombres', sql.VarChar(100), datosAdmin.nombres)
        .input('apellidos', sql.VarChar(100), datosAdmin.apellidos)
        .input('numero_identidad', sql.VarChar(20), datosAdmin.numero_identidad)
        .input('correo', sql.VarChar(150), datosAdmin.correo)
        .input('telefono', sql.VarChar(20), datosAdmin.telefono)
        .input('password_hash', sql.VarChar(256), hash)
        .input('sal', sql.VarChar(64), 'n-a-bcrypt') // bcrypt ya incluye el salt en el hash
        .query(`INSERT INTO Empleados
            (rol_id, nombres, apellidos, numero_identidad, correo, telefono,
             password_hash, sal, intentos_fallidos, bloqueado, activo, creado_en, actualizado_en)
            VALUES
            (@rol_id, @nombres, @apellidos, @numero_identidad, @correo, @telefono,
             @password_hash, @sal, 0, 0, 1, SYSUTCDATETIME(), SYSUTCDATETIME())`);

    console.log('✅ Usuario administrador creado:');
    console.log(`   correo:    ${datosAdmin.correo}`);
    console.log(`   password:  ${datosAdmin.passwordPlano}`);
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Error creando el admin:', err.message);
    process.exit(1);
});