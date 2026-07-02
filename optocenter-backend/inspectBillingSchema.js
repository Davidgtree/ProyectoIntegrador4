const { getPool } = require('./src/config/db');

(async () => {
  try {
    const pool = await getPool();
    const tables = await pool.request().query("SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' AND (TABLE_NAME LIKE '%factura%' OR TABLE_NAME LIKE '%venta%' OR TABLE_NAME LIKE '%pago%' OR TABLE_NAME LIKE '%recibo%' OR TABLE_NAME LIKE '%cobro%' OR TABLE_NAME LIKE '%orden%' OR TABLE_NAME LIKE '%detalle%' OR TABLE_NAME LIKE '%boleta%') ORDER BY TABLE_NAME");
    console.log('TABLES:');
    console.log(JSON.stringify(tables.recordset, null, 2));
    for (const row of tables.recordset) {
      const cols = await pool.request().query(`SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${row.TABLE_SCHEMA}' AND TABLE_NAME='${row.TABLE_NAME}' ORDER BY ORDINAL_POSITION`);
      console.log('COLUMNS', `${row.TABLE_SCHEMA}.${row.TABLE_NAME}`);
      console.log(JSON.stringify(cols.recordset, null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();