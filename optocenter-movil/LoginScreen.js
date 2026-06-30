import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';

// CONFIGURACIÓN DE LA IP DEL BACKEND
// - Tu IP local detectada es: 192.168.100.5
// - Si usas un celular físico (con Expo Go), debe estar en la misma red Wi-Fi y usar la IP local.
// - Si usas el emulador de Android de tu PC, cambia la IP a '10.0.2.2'.
const API_URL = Platform.OS === 'web'
  ? 'http://localhost:3000/api/auth/login'
  : 'http://192.168.13.14:3000/api/auth/login';

export const LoginScreen = ({ onLoginSuccess }) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!usuario || !password) {
      setError('Por favor, ingresa todos los campos.');
      return;
    }

    setError('');
    setCargando(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usuario, password }),
      });

      const text = await response.text();
      
      try {
        const data = JSON.parse(text);
        if (response.ok) {
          onLoginSuccess(data.token, data.user);
        } else {
          setError(data.msg || 'Credenciales incorrectas');
        }
      } catch (parseError) {
        console.error('Respuesta del servidor no es JSON. Contenido HTML:', text.substring(0, 500));
        setError(`Error del servidor (HTML recibido). Primeros caracteres: ${text.substring(0, 80)}...`);
      }
    } catch (err) {
      console.error('Error de conexión:', err);
      setError('No se pudo conectar con el servidor. Verifica la URL e IP.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <View style={styles.headerContainer}>
            <Text style={styles.logoText}>Optocenter</Text>
            <Text style={styles.subText}>Acceso al Portal Móvil</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Text style={styles.label}>Usuario</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: admin"
              placeholderTextColor="#a0aec0"
              value={usuario}
              onChangeText={setUsuario}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#a0aec0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2b6cb0',
  },
  subText: {
    fontSize: 16,
    color: '#718096',
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: '#fed7d7',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  errorText: {
    color: '#9b2c2c',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    height: 45,
    borderColor: '#cbd5e0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#2d3748',
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#3182ce',
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    shadowColor: '#3182ce',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
