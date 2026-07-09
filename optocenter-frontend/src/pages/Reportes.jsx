import React from 'react';
import './Reportes.css';

export default function Reportes() {
  return (
    <div className="reports-page">
      <div className="reports-header">
        <span className="section-label">Analíticas</span>
        <h2>Reportes</h2>
        <p>Genera y exporta reportes de pacientes, facturación e inventario.</p>
      </div>

      <div className="reports-grid">
        <div className="report-card">
          <h3>Pacientes</h3>
          <p>Exporta lista de pacientes o reportes por rango de fechas.</p>
          <button className="primary-button">Generar</button>
        </div>

        <div className="report-card">
          <h3>Facturación</h3>
          <p>Reportes de ventas, facturas y balances.</p>
          <button className="primary-button">Generar</button>
        </div>

        <div className="report-card">
          <h3>Inventario</h3>
          <p>Exporta stock y movimientos de producto.</p>
          <button className="primary-button">Generar</button>
        </div>
      </div>
    </div>
  );
}
