import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  // Si no hay usuario autenticado, lo redirige al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};