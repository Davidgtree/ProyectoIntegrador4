import { useState } from 'react';

export const Pacientes = () => {
  const [pacientes, setPacientes] = useState([]);

  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState('');
  const [celular, setCelular] = useState('');
  const [direccion, setDireccion] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!cedula || !nombre || !edad || !celular || !direccion) {
      setMensaje('Todos los campos son obligatorios.');
      return;
    }

    if (pacientes.some((p) => p.cedula === cedula)) {
      setMensaje('Ya existe un paciente con esta cédula.');
      return;
    }

    const nuevoPaciente = {
      cedula,
      nombre,
      edad,
      celular,
      direccion
    };

    setPacientes([...pacientes, nuevoPaciente]);

    setCedula('');
    setNombre('');
    setEdad('');
    setCelular('');
    setDireccion('');

    setMensaje('Paciente registrado correctamente.');
  };

  const handleEliminar = (cedulaEliminar) => {
    setPacientes(
      pacientes.filter((p) => p.cedula !== cedulaEliminar)
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h2>Registro y Control de Pacientes</h2>

      {mensaje && <p>{mensaje}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Cédula"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
        />

        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <input
          type="number"
          placeholder="Edad"
          value={edad}
          onChange={(e) => setEdad(e.target.value)}
        />

        <input
          type="text"
          placeholder="Celular"
          value={celular}
          onChange={(e) => setCelular(e.target.value)}
        />

        <input
          type="text"
          placeholder="Dirección"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
        />

        <button type="submit">
          Registrar Paciente
        </button>
      </form>

      <hr />

      <table border="1" width="100%">
        <thead>
          <tr>
            <th>Cédula</th>
            <th>Nombre</th>
            <th>Edad</th>
            <th>Celular</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {pacientes.length === 0 ? (
            <tr>
              <td colSpan="5">No hay pacientes registrados.</td>
            </tr>
          ) : (
            pacientes.map((paciente) => (
              <tr key={paciente.cedula}>
                <td>{paciente.cedula}</td>
                <td>{paciente.nombre}</td>
                <td>{paciente.edad}</td>
                <td>{paciente.celular}</td>
                <td>
                  <button
                    onClick={() =>
                      handleEliminar(paciente.cedula)
                    }
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};