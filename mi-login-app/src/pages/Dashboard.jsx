// src/pages/Dashboard.jsx
import { useAuth } from '../context/AuthContext';

export const DashboardHome = () => {
  const { user } = useAuth();
  return <h2>¡Bienvenido al sistema, {user?.username}!</h2>;
};

export const DashboardProfile = () => {
  return <h2>Sección de Perfil del Usuario</h2>;
};