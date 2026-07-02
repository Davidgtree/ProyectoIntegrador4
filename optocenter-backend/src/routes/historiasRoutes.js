const express = require('express');
const {
    listarHistorias,
    obtenerHistoria,
    obtenerHistoriaPorCita,
    crearHistoria,
    actualizarHistoria,
    finalizarHistoria,
} = require('../controllers/historiaClinicaController');
const { verificarToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verificarToken);

router.get('/cita/:citaId', obtenerHistoriaPorCita);
router.get('/:id', obtenerHistoria);
router.get('/', listarHistorias);
router.post('/', crearHistoria);
router.put('/:id', actualizarHistoria);
router.patch('/:id/finalizar', finalizarHistoria);

module.exports = router;