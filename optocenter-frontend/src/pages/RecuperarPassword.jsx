// src/pages/RecuperarPassword.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export const RecuperarPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    setCargando(true);

    const result = await forgotPassword(correo);

    setCargando(false);

    if (result.success) {
      setMensaje(result.msg || 'Revisa tu correo para continuar.');
    } else {
      setError(result.msg || 'No se pudo procesar la solicitud.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <h1>Recuperar contraseña</h1>
          <p>Ingresa tu correo para recibir instrucciones de recuperación.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {mensaje && <div className="auth-success">{mensaje}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Correo:</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@correo.com"
              required
            />
          </div>

          <button type="submit" className="auth-submit" disabled={cargando}>
            {cargando ? 'Enviando...' : 'Enviar instrucciones'}
          </button>
        </form>

        <div className="auth-footer">
          <button type="button" className="auth-link" onClick={() => navigate('/login')}>
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
};
 