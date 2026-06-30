require('dotenv').config();
const bcrypt = require('bcryptjs');
const sql = require('mssql');

async function updatePassword() {
    try {
        const config = {
            user: process.env.DB_USER || 'curso2b',
            password: process.env.DB_PASSWORD || 'curso2b',
            server: process.env.DB_SERVER || 'localhost',
            database: process.env.DB_NAME || 'optocenter',
            port: parseInt(process.env.DB_PORT) || 1433,
            options: {
                encrypt: false,
                trustServerCertificate: true
            }
        };

        const pool = await sql.connect(config);
        console.log('✅ Conectado a la base de datos');

        // La nueva contraseña será "admin123"
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        console.log('🔐 Nueva contraseña hasheada:', hashedPassword);

        // Actualizar la contraseña del admin (id = 1)
        const result = await pool.request()
            .input('password', sql.VarChar, hashedPassword)
            .input('id', sql.Int, 1)
            .query('UPDATE usuarios SET password = @password WHERE id = @id');

        if (result.rowsAffected[0] > 0) {
            console.log('✅ ¡Contraseña actualizada correctamente!');
            console.log('📝 Usuario: admin');
            console.log('📝 Nueva contraseña: admin123');
        } else {
            console.log('❌ No se encontró el usuario con id 1');
        }

        await sql.close();
        console.log('🔌 Conexión cerrada');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

updatePassword();