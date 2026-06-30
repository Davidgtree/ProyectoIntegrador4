import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LoginScreen } from './LoginScreen';
import { DashboardScreen } from './DashboardScreen';

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userToken, userData) => {
    setToken(userToken);
    setUser(userData);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <View style={styles.container}>
      {token === null ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <DashboardScreen user={user} onLogout={handleLogout} />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
