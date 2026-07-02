const express = require('express');
const { listarProveedores, crearProveedor } = require('../controllers/proveedoresController');
const { verificarToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verificarToken);
router.get('/', listarProveedores);
router.post('/', crearProveedor);

module.exports = router;
