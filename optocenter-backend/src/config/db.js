const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '127.0.0.1',
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};

let poolPromise = null;

/**
 * Devuelve un pool de conexión reutilizable.
 * Si la conexión falla, NO mata el proceso (process.exit) para que
 * el servidor pueda loguear el error claramente y reintentarse,
 * en vez de tumbar nodemon en cada reinicio durante desarrollo.
 */
function getPool() {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(dbConfig)
            .connect()
            .then((pool) => {
                console.log(`✅ Conectado a SQL Server (${dbConfig.server}) - BD: ${dbConfig.database}`);
                return pool;
            })
            .catch((err) => {
                console.error('❌ Error al conectar con SQL Server:', err.message);
                poolPromise = null; // permite reintentar en la siguiente petición
                throw err;
            });
    }
    return poolPromise;
}

module.exports = {
    sql,
    getPool,
};