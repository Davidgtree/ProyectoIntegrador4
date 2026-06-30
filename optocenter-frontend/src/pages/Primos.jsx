import { useState } from 'react';

export const Primos = () => {
  const [limite, setLimite] = useState('');
  const [resultado, setResultado] = useState(null);
  const [listaPrimos, setListaPrimos] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Función para determinar si un número es primo
  const esPrimo = (num) => {
    if (num <= 1) return false;
    if (num === 2) return true;
    if (num % 2 === 0) return false;
    for (let i = 3; i <= Math.sqrt(num); i += 2) {
      if (num % i === 0) return false;
    }
    return true;
  };

  const calcularPrimos = (e) => {
    e.preventDefault();
    const n = parseInt(limite, 10);

    if (isNaN(n) || n < 1) {
      alert('Por favor ingresa un número entero positivo mayor o igual a 1.');
      return;
    }

    setCargando(true);

    // Ejecutar en un pequeño setTimeout para no congelar la UI inmediatamente en números medianos
    setTimeout(() => {
      let contador = 0;
      const primosEncontrados = [];

      for (let i = 2; i <= n; i++) {
        if (esPrimo(i)) {
          contador++;
          // Guardar en la lista solo si no es excesivamente larga para visualización
          if (n <= 1000) {
            primosEncontrados.push(i);
          }
        }
      }

      setResultado(contador);
      setListaPrimos(primosEncontrados);
      setCargando(false);
    }, 50);
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', fontFamily: 'Outfit, sans-serif' }}>
      <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #ecf0f1', paddingBottom: '10px' }}>
        Contador de Números Primos
      </h2>
      <p style={{ color: '#718096', fontSize: '0.95rem', marginBottom: '20px' }}>
        Ingresa un número entero y descubre cuántos números primos existen desde el número 2 hasta el número ingresado.
      </p>

      <form onSubmit={calcularPrimos} style={{
        backgroundColor: '#ffffff',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
        marginBottom: '30px',
        display: 'flex',
        gap: '15px',
        alignItems: 'flex-end'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <label style={{ marginBottom: '6px', fontWeight: '600', fontSize: '0.9rem', color: '#4a5568' }}>
            Ingresa un número límite (N):
          </label>
          <input
            type="number"
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
            placeholder="Ej: 100"
            min="1"
            max="500000" // Coto razonable para evitar colgar la pestaña
            style={{ padding: '10px 14px', borderRadius: '4px', border: '1px solid #cbd5e0', outline: 'none', fontSize: '1rem' }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          style={{
            backgroundColor: cargando ? '#a0aec0' : '#319795',
            color: '#fff',
            padding: '11px 24px',
            border: 'none',
            borderRadius: '4px',
            cursor: cargando ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
            transition: 'background-color 0.2s',
            boxShadow: '0 2px 4px rgba(49, 151, 149, 0.3)'
          }}
          onMouseEnter={(e) => { if (!cargando) e.target.style.backgroundColor = '#2c7a7b'; }}
          onMouseLeave={(e) => { if (!cargando) e.target.style.backgroundColor = '#319795'; }}
        >
          {cargando ? 'Calculando...' : 'Calcular'}
        </button>
      </form>

      {/* Resultados */}
      {resultado !== null && !cargando && (
        <div style={{
          backgroundColor: '#ffffff',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ color: '#2d3748', marginTop: 0 }}>Resultado del Cálculo</h3>
          <p style={{ fontSize: '1.1rem', color: '#2d3748' }}>
            Entre el 2 y el <strong style={{ color: '#319795' }}>{limite}</strong> hay un total de:
          </p>
          <div style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            color: '#319795',
            margin: '15px 0',
            textAlign: 'center'
          }}>
            {resultado} <span style={{ fontSize: '1.2rem', fontWeight: 'normal', color: '#718096' }}>números primos</span>
          </div>

          {/* Lista de números primos si N es razonable */}
          {parseInt(limite, 10) <= 1000 ? (
            <div style={{ marginTop: '20px' }}>
              <strong style={{ color: '#4a5568', display: 'block', marginBottom: '8px' }}>Números primos encontrados:</strong>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                maxHeight: '150px',
                overflowY: 'auto',
                backgroundColor: '#f7fafc',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #edf2f7'
              }}>
                {listaPrimos.map((primo) => (
                  <span
                    key={primo}
                    style={{
                      backgroundColor: '#e6fffa',
                      color: '#234e52',
                      border: '1px solid #b2f5ea',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: '500'
                    }}
                  >
                    {primo}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: '#718096', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '20px' }}>
              * La lista detallada de números primos solo se muestra para límites menores o iguales a 1000 para optimizar el rendimiento.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
