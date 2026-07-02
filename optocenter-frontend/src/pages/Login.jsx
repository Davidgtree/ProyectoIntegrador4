// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export const Login = () => {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    const result = await login(correo, password);

    setCargando(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.msg || 'Credenciales incorrectas');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <svg className="auth-brand-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" />
          </svg>
          <h1>OptoCenter</h1>
          <p>Sistema de gestión para clínica óptica</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Correo:</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="admin@optocenter.com"
              required
            />
          </div>

          <div className="auth-field">
            <label>Contraseña:</label>
            <div className="auth-password-wrapper">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setMostrarPassword((v) => !v)}
              >
                {mostrarPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <div className="auth-row-between">
            <button
              type="button"
              className="auth-link"
              onClick={() => navigate('/recuperar-password')}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button type="submit" className="auth-submit" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="auth-footer">
          ¿No tienes cuenta?{' '}
          <button type="button" className="auth-link" onClick={() => navigate('/registro')}>
            Regístrate aquí
          </button>
        </div>
      </div>
    </div>
  );
};