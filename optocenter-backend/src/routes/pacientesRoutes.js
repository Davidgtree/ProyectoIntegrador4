const express = require('express');
const {
    listarPacientes,
    obtenerPaciente,
    crearPaciente,
    actualizarPaciente,
} = require('../controllers/pacientesController');
const { verificarToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verificarToken);

router.get('/', listarPacientes);
router.get('/:id', obtenerPaciente);
router.post('/', crearPaciente);
router.put('/:id', actualizarPaciente);

module.exports = router;
