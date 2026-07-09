const express = require('express');
const router = express.Router();
const { login, register, recuperarPassword, validarTokenRecuperacion, restablecerPassword, listarUsuarios, crearUsuario, cambiarEstadoUsuario, desbloquearUsuario, actualizarUsuario, verificarToken } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);
router.post('/recuperar-password', recuperarPassword);
router.post('/validar-token-recuperacion', validarTokenRecuperacion);
router.post('/restablecer-password', restablecerPassword);
router.get('/usuarios', verificarToken, listarUsuarios);
router.post('/usuarios', verificarToken, crearUsuario);
router.put('/usuarios/:id', verificarToken, actualizarUsuario);
router.patch('/usuarios/:id/estado', verificarToken, cambiarEstadoUsuario);
router.patch('/usuarios/:id/desbloquear', verificarToken, desbloquearUsuario);

module.exports = router;