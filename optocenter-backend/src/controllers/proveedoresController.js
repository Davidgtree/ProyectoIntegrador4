const { sql, getPool } = require('../config/db');

function validarProveedor(data) {
    const requeridos = ['razon_social', 'telefono', 'correo'];
    const faltantes = requeridos.filter((campo) => !String(data[campo] || '').trim());
    if (faltantes.length > 0) {
        return `Campos requeridos faltantes: ${faltantes.join(', ')}`;
    }
    return null;
}

async function listarProveedores(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`SELECT proveedor_id, razon_social, rif_nit, contacto_nombre, telefono, correo, direccion, condicion_credito, plazo_dias_pago, activo, creado_en FROM Proveedores ORDER BY razon_social`);
        return res.json(result.recordset);
    } catch (err) {
        console.error('Error listando proveedores:', err);
        return res.status(500).json({ message: 'Error al consultar proveedores' });
    }
}

async function crearProveedor(req, res) {
    const error = validarProveedor(req.body);
    if (error) return res.status(400).json({ message: error });

    const {
        razon_social,
        rif_nit,
        contacto_nombre,
        telefono,
        correo,
        direccion,
        condicion_credito,
        plazo_dias_pago,
        activo,
    } = req.body;

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('razon_social', sql.VarChar(200), razon_social)
            .input('rif_nit', sql.VarChar(60), rif_nit || null)
            .input('contacto_nombre', sql.VarChar(160), contacto_nombre)
            .input('telefono', sql.VarChar(60), telefono)
            .input('correo', sql.VarChar(120), correo)
            .input('direccion', sql.NVarChar(300), direccion || null)
            .input('condicion_credito', sql.VarChar(80), condicion_credito || null)
            .input('plazo_dias_pago', sql.Int, plazo_dias_pago ? Number(plazo_dias_pago) : null)
            .input('activo', sql.Bit, activo === undefined ? true : Boolean(activo))
            .query(`INSERT INTO Proveedores
                    (razon_social, rif_nit, contacto_nombre, telefono, correo, direccion, condicion_credito, plazo_dias_pago, activo, creado_en)
                    OUTPUT INSERTED.proveedor_id
                    VALUES
                    (@razon_social, @rif_nit, @contacto_nombre, @telefono, @correo, @direccion, @condicion_credito, @plazo_dias_pago, @activo, SYSUTCDATETIME())`);

        const proveedor_id = result.recordset[0].proveedor_id;
        return res.status(201).json({ message: 'Proveedor creado correctamente', proveedor_id });
    } catch (err) {
        console.error('Error creando proveedor:', err);
        return res.status(500).json({ message: 'Error al crear proveedor' });
    }
}

module.exports = {
    listarProveedores,
    crearProveedor,
};
