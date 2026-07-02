require('dotenv').config();
const { sql, getPool } = require('./src/config/db');
(async () => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT name, definition FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.Citas')");
    console.log('constraints:', JSON.stringify(result.recordset, null, 2));
    const rows = await pool.request().query("SELECT TOP 50 estado, COUNT(*) AS cnt FROM Citas GROUP BY estado");
    console.log('values:', JSON.stringify(rows.recordset, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
