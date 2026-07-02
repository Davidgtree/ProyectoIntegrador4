const express = require('express');
const {
    obtenerOpciones,
    listarProductos,
    obtenerProducto,
    crearProducto,
    actualizarProducto,
    ajustarStock,
} = require('../controllers/productosController');
const { verificarToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verificarToken);
router.get('/opciones', obtenerOpciones);
router.get('/', listarProductos);
router.get('/:id', obtenerProducto);
router.post('/', crearProducto);
router.put('/:id', actualizarProducto);
router.patch('/:id/stock', ajustarStock);

module.exports = router;
