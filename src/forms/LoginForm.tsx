import React from "react";
import { View, Button, StyleSheet, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import InputField from "../components/InputField";
import restClient from "../util/restClient";
import { login } from "../util/restClient";
import axios from 'axios';
// import authService from "../services/authService";
import { useRouter } from 'expo-router';
import * as AuthService from "../util/authService";
// ...

import Config from "../config";

const API_BASE_URL = Config.API_BASE_URL;
const LOGIN_CONTEXT = Config.LOGIN_CONTEXT;

// Validation Schema
const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const LoginForm = () => {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onLogin = async (data: any) => {
    setLoading(true);
    try {
      console.log("API URL:", API_BASE_URL + LOGIN_CONTEXT);

      const response = await axios.post(API_BASE_URL + LOGIN_CONTEXT, data);

      if (response.status === 200 || response.status === 201) {
        const { userId, sessionId } = response.data as any;

        if (AuthService && AuthService.saveAuthData) {
          await AuthService.saveAuthData(userId, sessionId);
        }

        // Navigate to the home page with userId params for session persistence
        router.push({ pathname: "/home", params: { userId: userId, username: (response.data as any).user.name } });
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <InputField name="email" placeholder="Email" control={control} error={errors.email?.message} />
      <InputField name="password" placeholder="Password" control={control} error={errors.password?.message} secureTextEntry />
      {loading ? (
        <ActivityIndicator size="large" color="#33f584" />
      ) : (
        <Button title="Login" onPress={handleSubmit(onLogin)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  formContainer: { width: "80%", color: "white", padding: 20, borderRadius: 10 },
});

export default LoginForm;
