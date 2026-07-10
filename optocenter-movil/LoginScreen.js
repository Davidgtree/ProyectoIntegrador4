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
  Keyboard,
  ImageBackground,
} from 'react-native';

// CONFIGURACIÓN DE LA IP DEL BACKEND
const API_URL = Platform.OS === 'web'
  ? 'http://localhost:3000/api/auth/login'
  : Platform.OS === 'android'
    ? 'http://192.168.1.37:3000/api/auth/login'
    : 'http://192.168.1.37:3000/api/auth/login';

export const LoginScreen = ({ onLoginSuccess }) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!usuario || !password) {
      setError('Por favor, ingresa todos los campos.');
      return;
    }

    setError('');
    setCargando(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo: usuario, password }),
        signal: controller.signal,
      });

      const text = await response.text();

      try {
        const data = JSON.parse(text);
        if (response.ok) {
          const userData = data.empleado || data.user || null;
          onLoginSuccess(data.token, userData);
        } else {
          setError(data.message || data.msg || 'Credenciales incorrectas');
        }
      } catch (parseError) {
        console.error('Respuesta del servidor no es JSON. Contenido HTML:', text.substring(0, 500));
        setError(`Error del servidor (HTML recibido). Primeros caracteres: ${text.substring(0, 80)}...`);
      }
    } catch (err) {
      console.error('Error de conexión:', err);
      if (err.name === 'AbortError') {
        setError('No se pudo conectar con el servidor. Verifica que el backend esté activo y la IP correcta.');
      } else {
        setError('No se pudo conectar con el servidor. Verifica la URL e IP.');
      }
    } finally {
      clearTimeout(timeoutId);
      setCargando(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.pexels.com/photos/305565/pexels-photo-305565.jpeg' }}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
              <View style={styles.headerContainer}>
                <View style={styles.brandBadge}>
                  <Text style={styles.brandInitial}>O</Text>
                </View>
                <Text style={styles.logoText}>OptoCenter</Text>
                <Text style={styles.subText}>Sistema de gestión para clínica óptica</Text>
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
                  placeholderTextColor="#94a3b8"
                  value={usuario}
                  onChangeText={setUsuario}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!mostrarPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setMostrarPassword((v) => !v)}
                  >
                    <Text style={styles.passwordToggleText}>
                      {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.linkContainer}>
                  <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleLogin}
                  disabled={cargando}
                >
                  {cargando ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Ingresar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 35, 66, 0.78)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandBadge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  brandInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  subText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  form: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    padding: 24,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
    marginTop: 6,
  },
  input: {
    height: 48,
    borderColor: '#cbd5e0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#f8fafc',
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordToggle: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  passwordToggleText: {
    color: '#3182ce',
    fontSize: 12,
    fontWeight: '600',
  },
  linkContainer: {
    alignItems: 'flex-end',
    marginTop: 10,
    marginBottom: 16,
  },
  linkText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#3182ce',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3182ce',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
