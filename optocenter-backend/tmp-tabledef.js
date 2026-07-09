require('dotenv').config();
const { getPool } = require('./src/config/db');

(async () => {
  const pool = await getPool();
  const result = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.Ventas')) AS definition");
  console.log(result.recordset[0]?.definition || 'NO_DEFINITION');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
