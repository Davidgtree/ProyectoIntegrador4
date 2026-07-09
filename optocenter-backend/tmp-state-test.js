require('dotenv').config();
const { getPool } = require('./src/config/db');

(async () => {
  const pool = await getPool();
  const states = ['Pendiente', 'Confirmada', 'Anulada', 'Activa', 'Inactiva', 'Pagada', 'Cancelada', 'Completada', 'Completa', 'Cerrada', 'Aprobada', 'Procesada', 'En proceso', 'Finalizada', 'Emitida', 'Abierta'];

  for (const state of states) {
    try {
      const query = `
        BEGIN TRY
          BEGIN TRANSACTION;
          INSERT INTO dbo.Ventas (estado, subtotal, descuento_total, impuestos, total, creado_en)
          VALUES ('${state}', 1, 0, 0, 1, GETUTCDATE());
          ROLLBACK TRANSACTION;
          SELECT 'OK' AS resultado, '${state}' AS estado;
        END TRY
        BEGIN CATCH
          IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
          SELECT 'FAIL' AS resultado, '${state}' AS estado, ERROR_MESSAGE() AS detalle;
        END CATCH;
      `;
      const result = await pool.request().query(query);
      console.log(JSON.stringify(result.recordset[0]));
    } catch (err) {
      console.log(JSON.stringify({ resultado: 'FAIL', estado: state, detalle: err.message }));
    }
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
