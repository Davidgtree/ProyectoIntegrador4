require('dotenv').config();
const { sql, getPool } = require('./src/config/db');
(async () => {
  try {
    const pool = await getPool();
    const tables = await pool.request().query("SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_SCHEMA, TABLE_NAME");
    console.log('TABLES:', JSON.stringify(tables.recordset, null, 2));
    const cols = await pool.request().query("SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME LIKE '%inv%' OR TABLE_NAME LIKE '%prod%' OR COLUMN_NAME LIKE '%inv%' OR COLUMN_NAME LIKE '%prod%' OR COLUMN_NAME LIKE '%stock%' OR COLUMN_NAME LIKE '%cantidad%' ORDER BY TABLE_NAME, ORDINAL_POSITION");
    console.log('COLUMNS:', JSON.stringify(cols.recordset, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
