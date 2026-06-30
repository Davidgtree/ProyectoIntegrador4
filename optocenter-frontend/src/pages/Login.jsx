// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleToggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setNombre('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Limpiar errores previos

    if (isRegisterMode) {
      // Validaciones del lado del cliente
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
      const result = await register(nombre, username, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.msg || 'Error al registrar usuario');
      }
    } else {
      const result = await login(username, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.msg || 'Credenciales incorrectas');
      }
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '80px', fontFamily: 'Outfit, sans-serif' }}>
      <form onSubmit={handleSubmit} style={{
        border: '1px solid #e2e8f0',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        width: '350px',
        backgroundColor: '#ffffff'
      }}>
        <h2 style={{ textAlign: 'center', color: '#2b6cb0', marginTop: 0, marginBottom: '25px' }}>
          {isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesión'}
        </h2>
        
        {error && (
          <div style={{
            backgroundColor: '#fed7d7',
            border: '1px solid #f5c6cb',
            color: '#9b2c2c',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '0.9rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {isRegisterMode && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontWeight: '500' }}>
              Nombre Completo:
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #cbd5e0',
                borderRadius: '6px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontWeight: '500' }}>
            Usuario:
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #cbd5e0',
              borderRadius: '6px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            placeholder="Ej: jperez"
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontWeight: '500' }}>
            Contraseña:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #cbd5e0',
              borderRadius: '6px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            placeholder="••••••••"
            required
          />
        </div>

        {isRegisterMode && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontWeight: '500' }}>
              Confirmar Contraseña:
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #cbd5e0',
                borderRadius: '6px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="••••••••"
              required
            />
          </div>
        )}

        <button type="submit" style={{
          width: '100%',
          backgroundColor: '#3182ce',
          color: '#ffffff',
          padding: '10px',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '1rem',
          boxShadow: '0 4px 6px rgba(49, 130, 206, 0.2)',
          transition: 'background-color 0.2s',
          marginBottom: '15px'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#2b6cb0'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#3182ce'}
        >
          {isRegisterMode ? 'Registrarse' : 'Ingresar'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
          <span style={{ color: '#718096' }}>
            {isRegisterMode ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}
          </span>{' '}
          <button
            type="button"
            onClick={handleToggleMode}
            style={{
              background: 'none',
              border: 'none',
              color: '#3182ce',
              cursor: 'pointer',
              fontWeight: '600',
              padding: 0,
              textDecoration: 'underline'
            }}
          >
            {isRegisterMode ? 'Inicia Sesión' : 'Regístrate aquí'}
          </button>
        </div>
      </form>
    </div>
  );
};