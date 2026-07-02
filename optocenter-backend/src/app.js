require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const pacientesRoutes = require('./routes/pacientesRoutes');
const citasRoutes = require('./routes/citasRoutes');
const historiasRoutes = require('./routes/historiasRoutes');
const productosRoutes = require('./routes/productosRoutes');
const proveedoresRoutes = require('./routes/proveedoresRoutes');
const facturacionRoutes = require('./routes/facturacionRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de salud, útil para confirmar rápido que el servidor y la BD responden
app.get('/api/health', async (req, res) => {
    try {
        const { getPool } = require('./config/db');
        await getPool();
        res.json({ status: 'ok', db: 'conectada' });
    } catch (err) {
        res.status(500).json({ status: 'error', db: 'desconectada', detalle: err.message });
    }
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/historias', historiasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/facturacion', facturacionRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de Optocenter corriendo en el puerto ${PORT}`);
});
