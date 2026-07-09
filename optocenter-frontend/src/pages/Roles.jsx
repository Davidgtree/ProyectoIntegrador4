import { useEffect, useMemo, useState } from 'react';
import './Roles.css';
import { AVAILABLE_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, persistRoles, readStoredRoles } from '../utils/permissions';

const buildInitialRoles = () => {
  const storedRoles = readStoredRoles();

  if (storedRoles) {
    return storedRoles.map((role) => ({
      ...role,
      nombre: role.id === 4 && String(role.nombre).toLowerCase() === 'vendedor' ? 'Recepcion' : role.nombre,
      permisos: Array.isArray(role.permisos) ? role.permisos : [],
    }));
  }

  return [
    {
      id: 1,
      nombre: 'Administrador',
      permisos: [...DEFAULT_ROLE_PERMISSIONS[1]],
    },
    {
      id: 2,
      nombre: 'Optómetra',
      permisos: [...DEFAULT_ROLE_PERMISSIONS[2]],
    },
    {
      id: 3,
      nombre: 'Cajero',
      permisos: [...DEFAULT_ROLE_PERMISSIONS[3]],
    },
    {
      id: 4,
      nombre: 'Recepcion',
      permisos: [...DEFAULT_ROLE_PERMISSIONS[4]],
    },
  ];
};

const formatPermissions = (perms) => perms.join(', ');

const Roles = () => {
  const [roles, setRoles] = useState(buildInitialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState(1);
  const [nuevoRol, setNuevoRol] = useState('');
  const [nuevoPermisos, setNuevoPermisos] = useState([]);

  useEffect(() => {
    persistRoles(roles);
  }, [roles]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || roles[0],
    [roles, selectedRoleId]
  );

  const handleSelectRole = (roleId) => {
    setSelectedRoleId(roleId);
  };

  const togglePermission = (permission) => {
    setRoles((current) =>
      current.map((role) => {
        if (role.id !== selectedRoleId) return role;

        const permisos = role.permisos.includes(permission)
          ? role.permisos.filter((item) => item !== permission)
          : [...role.permisos, permission];

        return { ...role, permisos };
      })
    );
  };

  const handleCreateRole = (event) => {
    event.preventDefault();

    const nombre = nuevoRol.trim();
    if (!nombre) return;

    const nextId = Math.max(...roles.map((role) => role.id)) + 1;
    const newRole = {
      id: nextId,
      nombre,
      permisos: [...nuevoPermisos],
    };

    setRoles((current) => [...current, newRole]);
    setNuevoRol('');
    setNuevoPermisos([]);
    setSelectedRoleId(nextId);
  };

  const handleNuevoPermiso = (permission) => {
    setNuevoPermisos((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  };

  return (
    <div className="roles-page">
      <div className="roles-header">
        <div>
          <span className="section-label">Roles</span>
          <h2>Gestión de roles y permisos</h2>
          <p>Define el acceso de cada perfil y ajusta permisos según la función del equipo.</p>
        </div>
      </div>

      <div className="roles-layout">
        <section className="roles-panel">
          <div className="panel-heading">
            <h3>Roles disponibles</h3>
          </div>

          <div className="roles-list">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                className={`role-card ${role.id === selectedRoleId ? 'role-card-active' : ''}`}
                onClick={() => handleSelectRole(role.id)}
              >
                <div>
                  <strong>{role.nombre}</strong>
                  <small>{formatPermissions(role.permisos)}</small>
                </div>
                <span>{role.permisos.length} permisos</span>
              </button>
            ))}
          </div>
        </section>

        <section className="roles-panel roles-detail">
          <div className="panel-heading">
            <h3>{selectedRole.nombre}</h3>
            <p>Permisos asignados</p>
          </div>

          <div className="permission-grid">
            {AVAILABLE_PERMISSIONS.map((permission) => (
              <label key={permission} className="permission-option">
                <input
                  type="checkbox"
                  checked={selectedRole.permisos.includes(permission)}
                  onChange={() => togglePermission(permission)}
                />
                <span>{permission}</span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="roles-panel roles-create-panel">
        <div className="panel-heading">
          <h3>Crear nuevo rol</h3>
          <p>Define un nombre y selecciona permisos iniciales.</p>
        </div>

        <form className="roles-form" onSubmit={handleCreateRole}>
          <label className="roles-field">
            <span>Nombre del rol</span>
            <input
              value={nuevoRol}
              onChange={(event) => setNuevoRol(event.target.value)}
              placeholder="Ej. Coordinador"
            />
          </label>

          <div className="permission-grid small">
            {AVAILABLE_PERMISSIONS.map((permission) => (
              <label key={permission} className="permission-option">
                <input
                  type="checkbox"
                  checked={nuevoPermisos.includes(permission)}
                  onChange={() => handleNuevoPermiso(permission)}
                />
                <span>{permission}</span>
              </label>
            ))}
          </div>

          <button type="submit" className="dashboard-action">
            Crear rol
          </button>
        </form>
      </section>
    </div>
  );
};

export default Roles;
