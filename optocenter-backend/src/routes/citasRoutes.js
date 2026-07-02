const express = require('express');
const {
    listarCitas,
    obtenerOpciones,
    crearCita,
    actualizarCita,
    cancelarCita,
    verificarPagoCita,
    confirmarPagoCita,
} = require('../controllers/citasController');
const { verificarToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:id/confirmar-pago', confirmarPagoCita);
router.use(verificarToken);

router.get('/opciones', obtenerOpciones);
router.get('/', listarCitas);
router.post('/', crearCita);
router.put('/:id', actualizarCita);
router.patch('/:id/cancelar', cancelarCita);
router.patch('/:id/pago', verificarPagoCita);

module.exports = router;
