const sql = require('mssql');
const path = require('path');

// Forzamos a dotenv a buscar el archivo .env EXACTAMENTE en la raíz del backend
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// CONTROL EN CONSOLA: Esto te ayudará a ver en clase si ya lee las variables
console.log('Verificando servidor del .env:', process.env.DB_SERVER);

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '127.0.0.1', // Si viene undefined, usa el local por defecto
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true 
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Crear y exportar la promesa del pool
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log(`¡Conectado exitosamente a la base de datos: ${dbConfig.database}!`);
        return pool;
    })
    .catch(err => {
        console.error('Error al conectar con SQL Server: ', err);
        process.exit(1);
    });

module.exports = {
    sql,
    poolPromise
};