const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Definir el endpoint de Login
router.post('/login', authController.login);
router.post('/register', authController.register);

module.exports = router;