require('dotenv').config();
const { getPool } = require('./src/config/db');
(async () => {
  try {
    const pool = await getPool();
    const categories = await pool.request().query(
      "SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('Categorias','Proveedores') ORDER BY TABLE_NAME, ORDINAL_POSITION"
    );
    console.log(JSON.stringify(categories.recordset, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
