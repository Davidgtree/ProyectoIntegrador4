import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from 'react-native';

export const DashboardScreen = ({ user, onLogout }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.greeting}>¡Bienvenido de vuelta!</Text>
          <Text style={styles.userName}>{user?.nombre || user?.usuario}</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Usuario:</Text>
            <Text style={styles.infoValue}>{user?.usuario}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rol en el Sistema:</Text>
            <View style={[styles.badge, user?.rol === 'admin' ? styles.badgeAdmin : styles.badgeUser]}>
              <Text style={[styles.badgeText, user?.rol === 'admin' ? styles.badgeTextAdmin : styles.badgeTextUser]}>
                {user?.rol ? user.rol.toUpperCase() : 'USUARIO'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  greeting: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2b6cb0',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#2d3748',
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeAdmin: {
    backgroundColor: '#feebc8',
  },
  badgeUser: {
    backgroundColor: '#e2e8f0',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeTextAdmin: {
    color: '#c05621',
  },
  badgeTextUser: {
    color: '#4a5568',
  },
  logoutButton: {
    backgroundColor: '#e53e3e',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 6,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e53e3e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
