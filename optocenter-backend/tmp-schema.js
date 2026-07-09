require('dotenv').config();
const { getPool } = require('./src/config/db');

(async () => {
  const pool = await getPool();
  const columns = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Ventas' ORDER BY ORDINAL_POSITION");
  console.log('COLUMNS');
  console.log(JSON.stringify(columns.recordset, null, 2));

  const states = await pool.request().query("SELECT DISTINCT estado FROM dbo.Ventas");
  console.log('DISTINCT STATES');
  console.log(JSON.stringify(states.recordset, null, 2));

  const checks = await pool.request().query("SELECT name, definition FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.Ventas')");
  console.log('CHECKS');
  console.log(JSON.stringify(checks.recordset, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
