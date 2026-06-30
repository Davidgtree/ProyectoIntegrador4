// src/context/AuthContext.jsx (Actualizado para consumir la API)
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (usuario, password) => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usuario, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Guardamos el token en localStorage para persistencia básica
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, msg: data.msg || 'Error al iniciar sesión' };
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      return { success: false, msg: 'No se pudo conectar con el servidor.' };
    }
  };

  const register = async (nombre, usuario, password) => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre, usuario, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, msg: data.msg || 'Error al registrar usuario' };
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      return { success: false, msg: 'No se pudo conectar con el servidor.' };
    }
  };


  const paciente = async (nombre, apellido, fechaNacimiento, cedula, celular, direccion) => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre, apellido, fechaNacimiento, cedula, celular, direccion }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, msg: data.msg || 'Error al registrar paciente' };
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      return { success: false, msg: 'No se pudo conectar con el servidor.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);