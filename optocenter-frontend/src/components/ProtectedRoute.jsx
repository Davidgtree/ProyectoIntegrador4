import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTE_PERMISSIONS, hasPermission } from '../utils/permissions';

export const ProtectedRoute = ({ children }) => {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  const requiredPermission = ROUTE_PERMISSIONS[location.pathname];
  const roleId = Number(user?.rol_id);

  if (requiredPermission && !hasPermission(roleId, requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};