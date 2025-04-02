import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';


interface HomePageProps {
  onLogout?: () => void;
  username?: string;
}

const HomePage: React.FC<HomePageProps> = ({ onLogout, username }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {username || 'User'}!</Text>
      <Text style={styles.subtitle}>This is your home page.</Text>
      {onLogout && (
        <Button title="Logout" onPress={onLogout} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
});

export default HomePage;