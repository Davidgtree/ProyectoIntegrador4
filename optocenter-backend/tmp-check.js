const { getPool } = require('./src/config/db');
(async () => {
  const pool = await getPool();
  const result = await pool.request().query("SELECT definition FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.Ventas')");
  console.log(JSON.stringify(result.recordset, null, 2));
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
