export const AVAILABLE_PERMISSIONS = [
  'Pacientes',
  'Citas',
  'Historias',
  'Consultas',
  'Inventario',
  'Proveedores',
  'Facturación',
  'Laboratorio',
  'Usuarios',
  'Reportes',
];

export const DEFAULT_ROLE_PERMISSIONS = {
  1: AVAILABLE_PERMISSIONS.filter((permission) => permission !== 'Consultas'),
  2: ['Pacientes', 'Citas', 'Historias', 'Consultas', 'Laboratorio'],
  3: ['Pacientes', 'Citas', 'Facturación'],
  4: ['Pacientes', 'Citas'],
};

export const MENU_ITEMS = [
  { label: 'Inicio', to: '/dashboard', icon: 'IN', end: true, permission: null },
  { label: 'Pacientes', to: '/dashboard/pacientes', icon: 'PA', permission: 'Pacientes' },
  { label: 'Citas', to: '/dashboard/citas', icon: 'CI', permission: 'Citas' },
  { label: 'Historias', to: '/dashboard/historial', icon: 'HI', permission: 'Historias' },
  { label: 'Consultas', to: '/dashboard/consultas', icon: 'CO', permission: 'Consultas' },
  { label: 'Inventario', to: '/dashboard/inventario', icon: 'IV', permission: 'Inventario' },
  { label: 'Proveedores', to: '/dashboard/proveedores', icon: 'PV', permission: 'Proveedores' },
  { label: 'Facturacion', to: '/dashboard/facturacion', icon: 'FA', permission: 'Facturación' },
  { label: 'Laboratorio', to: '/dashboard/laboratorio', icon: 'LB', permission: 'Laboratorio' },
  { label: 'Usuarios', to: '/dashboard/usuarios', icon: 'US', permission: 'Usuarios' },
  { label: 'Roles', to: '/dashboard/roles', icon: 'RL', permission: 'Usuarios' },
  { label: 'Reportes', to: '/dashboard/reportes', icon: 'RE', permission: 'Reportes' },
  { label: 'Mi Perfil', to: '/dashboard/perfil', icon: 'MP', permission: null },
];

export const ROUTE_PERMISSIONS = {
  '/dashboard': null,
  '/dashboard/perfil': null,
  '/dashboard/pacientes': 'Pacientes',
  '/dashboard/citas': 'Citas',
  '/dashboard/historial': 'Historias',
  '/dashboard/consultas': 'Consultas',
  '/dashboard/inventario': 'Inventario',
  '/dashboard/proveedores': 'Proveedores',
  '/dashboard/facturacion': 'Facturación',
  '/dashboard/laboratorio': 'Laboratorio',
  '/dashboard/usuarios': 'Usuarios',
  '/dashboard/roles': 'Usuarios',
  '/dashboard/reportes': 'Reportes',
};

const ROLES_STORAGE_KEY = 'appRoles';

const normalizePermissions = (permissions) =>
  Array.isArray(permissions)
    ? permissions.filter((permission) => AVAILABLE_PERMISSIONS.includes(permission))
    : [];

export const readStoredRoles = () => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(ROLES_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error('No se pudieron leer los roles guardados', error);
    return null;
  }
};

export const persistRoles = (roles) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
};

export const getRolePermissions = (roleId) => {
  const numericRoleId = Number(roleId);
  const storedRoles = readStoredRoles();

  if (storedRoles) {
    const role = storedRoles.find((item) => Number(item.id) === numericRoleId);
    if (role && Array.isArray(role.permisos)) {
      return normalizePermissions(role.permisos);
    }
  }

  return normalizePermissions(DEFAULT_ROLE_PERMISSIONS[numericRoleId] || []);
};

export const hasPermission = (roleId, permission) => getRolePermissions(roleId).includes(permission);

export const getPatientAccessPolicy = (roleId) => {
  const numericRoleId = Number(roleId);

  if (numericRoleId === 1) {
    return {
      canRead: true,
      canCreate: true,
      canEdit: true,
      canToggleActive: true,
      canViewInactive: true,
      readOnly: false,
      mode: 'admin',
    };
  }

  if (numericRoleId === 4) {
    return {
      canRead: true,
      canCreate: true,
      canEdit: true,
      canToggleActive: false,
      canViewInactive: false,
      readOnly: false,
      mode: 'reception',
    };
  }

  if (numericRoleId === 2) {
    return {
      canRead: true,
      canCreate: false,
      canEdit: false,
      canToggleActive: false,
      canViewInactive: false,
      readOnly: true,
      mode: 'readOnly',
    };
  }

  return {
    canRead: true,
    canCreate: false,
    canEdit: false,
    canToggleActive: false,
    canViewInactive: false,
    readOnly: true,
    mode: 'readOnly',
  };
};

export const getAppointmentAccessPolicy = (roleId) => {
  const numericRoleId = Number(roleId);

  if (numericRoleId === 1) {
    return {
      canViewAllAppointments: true,
      canCreateEditAppointment: true,
      canCancelAppointment: true,
      canConfirmPayment: true,
      canManageClinicalConsults: false,
      canViewPaymentStatus: true,
      mode: 'admin',
    };
  }

  if (numericRoleId === 4) {
    return {
      canViewAllAppointments: true,
      canCreateEditAppointment: true,
      canCancelAppointment: true,
      canConfirmPayment: false,
      canManageClinicalConsults: false,
      canViewPaymentStatus: true,
      mode: 'reception',
    };
  }

  if (numericRoleId === 2) {
    return {
      canViewAllAppointments: false,
      canCreateEditAppointment: false,
      canCancelAppointment: false,
      canConfirmPayment: false,
      canManageClinicalConsults: true,
      canViewPaymentStatus: true,
      mode: 'optometra',
    };
  }

  return {
    canViewAllAppointments: false,
    canCreateEditAppointment: false,
    canCancelAppointment: false,
    canConfirmPayment: false,
    canManageClinicalConsults: false,
    canViewPaymentStatus: true,
    mode: 'readOnly',
  };
};

export const getBillingAccessPolicy = (roleId) => {
  const numericRoleId = Number(roleId);

  if (numericRoleId === 1) {
    return {
      canViewBilling: true,
      canCreateSale: false,
      canConfirmSale: false,
      canVoidSale: false,
      canManagePayments: false,
      canEmitInvoice: false,
      mode: 'admin',
    };
  }

  if (numericRoleId === 3) {
    return {
      canViewBilling: true,
      canCreateSale: true,
      canConfirmSale: true,
      canVoidSale: true,
      canManagePayments: true,
      canEmitInvoice: true,
      mode: 'cashier',
    };
  }

  return {
    canViewBilling: false,
    canCreateSale: false,
    canConfirmSale: false,
    canVoidSale: false,
    canManagePayments: false,
    canEmitInvoice: false,
    mode: 'readOnly',
  };
};
