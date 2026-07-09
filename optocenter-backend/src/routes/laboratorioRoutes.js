const express = require('express');
const {
    listarOrdenes,
    obtenerOrden,
    crearOrden,
    actualizarEstado,
    entregarOrden,
} = require('../controllers/laboratorioController');
const { verificarToken } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(verificarToken);

router.get('/', listarOrdenes);
router.get('/:id', obtenerOrden);
router.post('/', crearOrden);
router.patch('/:id/estado', actualizarEstado);
router.patch('/:id/entregar', entregarOrden);

module.exports = router;
