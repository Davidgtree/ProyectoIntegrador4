import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (username, password) => {
    // Simulación de validación (puedes decirles que aquí irá la API luego)
    if (username === 'admin' && password === '1234') {
      setUser({ username: 'Admin' });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para que los alumnos lo usen fácilmente
export const useAuth = () => useContext(AuthContext);