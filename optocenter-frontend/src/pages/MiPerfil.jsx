import React from 'react';
import './MiPerfil.css';

export default function MiPerfil() {
  return (
    <div className="profile-page">
      <header className="profile-header">
        <span className="section-label">Cuenta</span>
        <h2>Perfil del usuario</h2>
        <p>Aquí puedes consultar y actualizar la información de tu cuenta.</p>
      </header>

      <div className="profile-layout">
        <aside className="profile-form-card dashboard-card usuarios-form-card">
          <div className="panel-heading">
            <h3>Editar información</h3>
          </div>

          <form className="profile-form" onSubmit={(e) => e.preventDefault()}>
            <div className="profile-row two-cols">
              <label>Nombre</label>
              <input defaultValue="Danilo Calderón" />
            </div>

            <div className="profile-row two-cols">
              <label>Usuario</label>
              <input defaultValue="danilocalderon" />
            </div>

            <div className="profile-row two-cols">
              <label>Correo</label>
              <input defaultValue="sistemasdavic@gmail.com" />
            </div>

            <div className="profile-row two-cols">
              <label>Teléfono</label>
              <input defaultValue="0987846531" />
            </div>

            <div className="profile-actions">
              <button type="submit" className="dashboard-action">Guardar cambios</button>
              <button type="button" className="dashboard-secondary">Cancelar</button>
            </div>
          </form>
        </aside>

        <section className="profile-side">
          <div className="profile-card dashboard-card">
            <h3>Seguridad</h3>
            <div className="profile-row">
              <label>Contraseña</label>
              <button className="table-button">Cambiar contraseña</button>
            </div>
            <div className="profile-row">
              <label>Sesiones activas</label>
              <div className="profile-value">1 dispositivo</div>
            </div>
          </div>

          <div className="profile-card dashboard-card">
            <h3>Preferencias</h3>
            <div className="profile-row">
              <label>Idioma</label>
              <div className="profile-value">Español</div>
            </div>
            <div className="profile-row">
              <label>Notificaciones</label>
              <div className="profile-value">Email activo</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
