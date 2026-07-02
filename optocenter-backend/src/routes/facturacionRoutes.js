const express = require('express');
const {
    listarVentas,
    obtenerVenta,
    crearVenta,
    confirmarVenta,
    anularVenta,
    listarFacturas,
    obtenerFactura,
    crearFactura,
    listarPagosVenta,
    registrarPagoVenta,
} = require('../controllers/facturacionController');
const { verificarToken } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(verificarToken);

router.get('/ventas', listarVentas);
router.get('/ventas/:id', obtenerVenta);
router.post('/ventas', crearVenta);
router.patch('/ventas/:id/confirmar', confirmarVenta);
router.patch('/ventas/:id/anular', anularVenta);
router.get('/ventas/:id/pagos', listarPagosVenta);
router.post('/ventas/:id/pagos', registrarPagoVenta);

router.get('/facturas', listarFacturas);
router.get('/facturas/:id', obtenerFactura);
router.post('/facturas', crearFactura);

module.exports = router;
