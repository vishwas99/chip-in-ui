import React from "react";
import { View, Text, StyleSheet } from "react-native";
import LoginForm from "./forms/LoginForm";
import { useNavigation } from "@react-navigation/native";

const LoginScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back!</Text>
      <Text style={styles.subtitle}>Login to continue</Text>
      <LoginForm />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "black" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 5, color: "#fff" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 20 },
});

export default LoginScreen;
