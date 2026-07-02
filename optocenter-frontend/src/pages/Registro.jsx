// src/pages/Registro.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

// rol_id según la tabla Roles sembrada en la base (1=Administrador queda excluido a propósito)
const ROLES = [
  { id: 2, nombre: 'Optómetra' },
  { id: 3, nombre: 'Cajero' },
  { id: 4, nombre: 'Vendedor' },
];

export const Registro = () => {
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [numeroIdentidad, setNumeroIdentidad] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rolId, setRolId] = useState(ROLES[0].id);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setCargando(true);
    const result = await register({
      nombres,
      apellidos,
      numero_identidad: numeroIdentidad,
      correo,
      telefono,
      password,
      rol_id: rolId,
    });
    setCargando(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.msg || 'No se pudo completar el registro');
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
          <h1>Crear cuenta</h1>
          <p>Registro de personal de OptoCenter</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Nombres:</label>
            <input value={nombres} onChange={(e) => setNombres(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label>Apellidos:</label>
            <input value={apellidos} onChange={(e) => setApellidos(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label>Número de identidad:</label>
            <input value={numeroIdentidad} onChange={(e) => setNumeroIdentidad(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label>Correo:</label>
            <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label>Teléfono (opcional):</label>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>

          <div className="auth-field">
            <label>Rol:</label>
            <select value={rolId} onChange={(e) => setRolId(Number(e.target.value))}>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>

          <div className="auth-field">
            <label>Contraseña:</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label>Confirmar contraseña:</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>

          <button type="submit" className="auth-submit" disabled={cargando}>
            {cargando ? 'Creando cuenta...' : 'Registrarme'}
          </button>
        </form>

        <div className="auth-footer">
          ¿Ya tienes cuenta?{' '}
          <button type="button" className="auth-link" onClick={() => navigate('/login')}>
            Inicia sesión
          </button>
        </div>
      </div>
    </div>
  );
};