const express = require('express');
const {
    listarPacientes,
    obtenerPaciente,
    crearPaciente,
    actualizarPaciente,
    cambiarEstadoPaciente,
} = require('../controllers/pacientesController');
const { verificarToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verificarToken);

router.get('/', listarPacientes);
router.get('/buscar', listarPacientes);
router.get('/:id', obtenerPaciente);
router.post('/', crearPaciente);
router.put('/:id', actualizarPaciente);
router.patch('/:id/estado', cambiarEstadoPaciente);

module.exports = router;
