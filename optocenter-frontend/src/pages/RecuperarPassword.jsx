// src/pages/RecuperarPassword.jsx
import { useNavigate } from 'react-router-dom';
import './Auth.css';
 
export const RecuperarPassword = () => {
  const navigate = useNavigate();
 
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <h1>Recuperar contraseña</h1>
          <p>Esta función se conecta al envío de correo en el siguiente paso.</p>
        </div>
        <div className="auth-footer">
          <button type="button" className="auth-link" onClick={() => navigate('/login')}>
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
};
 