import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Historias.css';

const API_HISTORIAS = 'http://localhost:3000/api/historias';
const API_PACIENTES = 'http://localhost:3000/api/pacientes';

export const Historias = () => {
  const [historias, setHistorias] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [historiasPaciente, setHistoriasPaciente] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [cargando, setCargando] = useState(true);
  const [buscandoPacientes, setBuscandoPacientes] = useState(false);
  const [cargandoPaciente, setCargandoPaciente] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarHistorias = async () => {
      setCargando(true);
      setError('');

      try {
        const response = await fetch(API_HISTORIAS, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'No se pudo cargar el historial de consultas');
        setHistorias(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    cargarHistorias();
  }, []);

  useEffect(() => {
    if (!buscar.trim()) {
      setPacientes([]);
      setError('');
      return;
    }

    const timeout = setTimeout(async () => {
      setError('');
      setBuscandoPacientes(true);

      try {
        const response = await fetch(`${API_PACIENTES}?buscar=${encodeURIComponent(buscar)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'No se pudo buscar pacientes');
        setPacientes(data);
        if (data.length === 0) {
          setError('No se encontró ningún paciente con ese término.');
        }
      } catch (err) {
        setPacientes([]);
        setError(err.message);
      } finally {
        setBuscandoPacientes(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [buscar]);

  const buscarPacientes = async (event) => {
    event.preventDefault();
    if (!buscar.trim()) {
      setError('Ingresa cédula, nombre o apellido para buscar un paciente.');
    }
  };

  const cargarHistoriasPorPaciente = async (paciente) => {
    setPacienteSeleccionado(paciente);
    setError('');
    setCargandoPaciente(true);

    try {
      const response = await fetch(`${API_HISTORIAS}?paciente_id=${paciente.paciente_id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo cargar las historias del paciente');
      setHistoriasPaciente(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoPaciente(false);
    }
  };

  return (
    <div className="histories-page">
      <section className="histories-header">
        <div>
          <span className="section-label">Historias clínicas</span>
          <h2>Busca al paciente y revisa sus historias</h2>
          <p>Escribe cédula, nombre o apellido para encontrar un paciente; luego abre sus historias clínicas.</p>
        </div>
      </section>

      {error && <div className="patient-alert patient-alert-error">{error}</div>}

      <section className="histories-search dashboard-card">
        <form className="histories-search-form" onSubmit={buscarPacientes}>
          <input
            type="text"
            placeholder="Buscar paciente por cédula, nombre o apellido"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
          <button type="submit">Buscar paciente</button>
        </form>
        <div className="search-help">
          Escribe para buscar pacientes en directo; los resultados aparecerán debajo.
        </div>

        {buscandoPacientes && <div className="patient-loading">Buscando pacientes...</div>}

        {(pacientes.length > 0 || (!buscandoPacientes && buscar.trim())) && (
          <div className="patients-results">
            <h3>Resultados de búsqueda</h3>
            {pacientes.length === 0 ? (
              <div className="patient-results-empty">No se encontraron pacientes con ese término.</div>
            ) : (
              <div className="patients-grid">
                {pacientes.map((paciente) => (
                  <div key={paciente.paciente_id} className="patient-card">
                    <div>
                      <strong>{paciente.nombres} {paciente.apellidos}</strong>
                      <span>{paciente.numero_identidad}</span>
                    </div>
                    <div>
                      <span>{paciente.edad != null ? `${paciente.edad} años` : 'Edad no disponible'}</span>
                      <button type="button" onClick={() => cargarHistoriasPorPaciente(paciente)}>
                        Ver historias
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {pacienteSeleccionado && (
        <section className="selected-patient dashboard-card">
          <div className="patient-summary">
            <div>
              <span>Paciente seleccionado</span>
              <strong>{pacienteSeleccionado.nombres} {pacienteSeleccionado.apellidos}</strong>
            </div>
            <div>
              <span>Cédula</span>
              <strong>{pacienteSeleccionado.numero_identidad}</strong>
            </div>
            <div>
              <span>Edad</span>
              <strong>{pacienteSeleccionado.edad != null ? `${pacienteSeleccionado.edad} años` : '-'}</strong>
            </div>
            <div>
              <span>Género</span>
              <strong>{pacienteSeleccionado.genero || '-'}</strong>
            </div>
          </div>
        </section>
      )}

      <section className="histories-list dashboard-card">
        {cargandoPaciente ? (
          <p className="histories-empty">Cargando historias del paciente...</p>
        ) : !pacienteSeleccionado ? (
          <p className="histories-empty">Busca un paciente para ver sus historias clínicas.</p>
        ) : historiasPaciente.length === 0 ? (
          <p className="histories-empty">No se encontraron historias clínicas para este paciente.</p>
        ) : (
          <div className="histories-table-wrap">
            <table className="histories-table">
              <thead>
                <tr>
                  <th>Historia N°</th>
                  <th>Fecha</th>
                  <th>Optómetra</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historiasPaciente.map((historia) => (
                  <tr key={historia.historia_id}>
                    <td>{historia.historia_id}</td>
                    <td>{new Date(historia.fecha_consulta).toLocaleDateString('es-PE')}</td>
                    <td>{historia.optometra_nombre}</td>
                    <td>{historia.bloqueada ? 'Finalizada' : 'Abierta'}</td>
                    <td>
                      <Link className="view-button" to={`/dashboard/consultas?historia_id=${historia.historia_id}`}>
                        Ver información
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
