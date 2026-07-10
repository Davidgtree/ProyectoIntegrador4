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
  const userPermissions = Array.isArray(user?.permisos) ? user.permisos : [];
  const hasAccess = !requiredPermission ||
    userPermissions.includes(requiredPermission) ||
    hasPermission(roleId, requiredPermission);

  if (requiredPermission && !hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};