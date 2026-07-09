import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Auth.css';

const API_URL = 'http://localhost:3000/api/auth';

export const RestablecerPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [validando, setValidando] = useState(Boolean(token));

  const tokenValido = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    const validarToken = async () => {
      if (!token) {
        setError('No se proporcionó un token de recuperación.');
        setValidando(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/validar-token-recuperacion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Token inválido o expirado.');
        }
      } catch {
        setError('No se pudo validar el token.');
      } finally {
        setValidando(false);
      }
    };

    validarToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!token) {
      setError('No se proporcionó un token de recuperación.');
      return;
    }

    if (nuevaPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);

    try {
      const response = await fetch(`${API_URL}/restablecer-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nuevaPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'No se pudo actualizar la contraseña.');
      } else {
        setMensaje(data.message || 'Contraseña actualizada correctamente.');
        setTimeout(() => navigate('/login'), 1800);
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <h1>Restablecer contraseña</h1>
          <p>Define una nueva contraseña para acceder a OptoCenter.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {mensaje && <div className="auth-success">{mensaje}</div>}

        {validando ? (
          <p className="auth-info">Validando enlace…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="auth-field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="auth-submit" disabled={cargando || !tokenValido}>
              {cargando ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <button type="button" className="auth-link" onClick={() => navigate('/login')}>
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
};
