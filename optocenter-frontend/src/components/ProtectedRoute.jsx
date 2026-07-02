import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, token } = useAuth();

  // Si no hay usuario autenticado o token, lo redirige al login
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};