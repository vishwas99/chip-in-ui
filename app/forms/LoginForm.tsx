import React from "react";
import { View, Button, StyleSheet } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import InputField from "../components/InputField";
import restClient from "../util/restClient";
import { login } from "../util/restClient";
import axios from 'axios';
// import authService from "../services/authService";
import { useRouter } from 'expo-router';
// import Cookies from '@react-native-cookies/cookies';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";
const LOGIN_CONTEXT = process.env.EXPO_PUBLIC_LOGIN_CONTEXT || "/auth/login";

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

  const onLogin = async (data: any) => {
    console.log("Login Requested:", data);
    try {
      console.log("API URL:", API_BASE_URL + LOGIN_CONTEXT);
      
      const response = await axios.post(API_BASE_URL + LOGIN_CONTEXT, data);
      // setData(response.data);
      console.log("Response data:", response.data);
      if(response.status === 200){
        console.log("Login successful");
        // const cookies = await Cookies.get(API_BASE_URL);
        // console.log('Cookies stored:', cookies);
        // Navigate to the home page or perform any other action
        router.navigate("/components/HomePage");
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <View style={styles.formContainer}>
      <InputField name="email" placeholder="Email" control={control} error={errors.email?.message} />
      <InputField name="password" placeholder="Password" control={control} error={errors.password?.message} secureTextEntry />
      <Button title="Login" onPress={handleSubmit(onLogin)} />
    </View>
  );
};

const styles = StyleSheet.create({
  formContainer: { width: "80%", color: "white", padding: 20, borderRadius: 10 },
});

export default LoginForm;
