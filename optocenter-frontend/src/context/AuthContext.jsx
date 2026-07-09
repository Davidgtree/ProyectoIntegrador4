// src/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react';
import { DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions';

const AuthContext = createContext();

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const API_URL = 'http://localhost:3000/api/auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const guardarSesion = (data) => {
    const empleado = {
      ...data.empleado,
      permisos: data.empleado?.permisos || DEFAULT_ROLE_PERMISSIONS[Number(data.empleado?.rol_id)] || [],
    };

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(empleado));
    setUser(empleado);
    setToken(data.token);
  };

  const login = async (correo, password) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      });
      const data = await response.json();

      if (response.ok) {
        guardarSesion(data);
        return { success: true };
      }
      return { success: false, msg: data.message || 'Error al iniciar sesión' };
    } catch (error) {
      console.error('Error de conexión:', error);
      return { success: false, msg: 'No se pudo conectar con el servidor.' };
    }
  };

  // datosEmpleado: { nombres, apellidos, numero_identidad, correo, telefono, password, rol_id }
  const register = async (datosEmpleado) => {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEmpleado),
      });
      const data = await response.json();

      if (response.ok) {
        guardarSesion(data);
        return { success: true };
      }
      return { success: false, msg: data.message || 'Error al registrar' };
    } catch (error) {
      console.error('Error de conexión:', error);
      return { success: false, msg: 'No se pudo conectar con el servidor.' };
    }
  };

  const forgotPassword = async (correo) => {
    try {
      const response = await fetch(`${API_URL}/recuperar-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo }),
      });
      const data = await response.json();

      if (response.ok) {
        return { success: true, msg: data.message || 'Revisa tu correo para continuar con la recuperación.' };
      }
      return { success: false, msg: data.message || 'No se pudo procesar la solicitud.' };
    } catch (error) {
      console.error('Error de conexión:', error);
      return { success: false, msg: 'No se pudo conectar con el servidor.' };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, forgotPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);