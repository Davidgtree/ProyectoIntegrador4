require('dotenv').config();

const { getPool } = require('./src/config/db');

(async () => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      TABLE_SCHEMA,
      TABLE_NAME,
      COLUMN_NAME,
      DATA_TYPE,
      CHARACTER_MAXIMUM_LENGTH,
      IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME LIKE '%Historia%'
       OR TABLE_NAME LIKE '%Consulta%'
       OR TABLE_NAME LIKE '%Receta%'
       OR TABLE_NAME LIKE '%Diagnostico%'
       OR TABLE_NAME LIKE '%Anamnesis%'
       OR TABLE_NAME LIKE '%Evaluacion%'
       OR TABLE_NAME LIKE '%Paciente%'
       OR TABLE_NAME LIKE '%Cita%'
    ORDER BY TABLE_NAME, ORDINAL_POSITION;
  `);

  console.table(result.recordset);
  process.exit(0);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
