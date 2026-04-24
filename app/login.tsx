import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Check path validity: app/login.tsx -> ../src/...
import Config from '../src/config';
import * as AuthService from '../src/util/authService';

const API_BASE_URL = Config.API_BASE_URL;
const LOGIN_CONTEXT = Config.LOGIN_CONTEXT;

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onLogin = async (data: LoginFormData) => {
    setLoading(true);
    setGeneralError(null);
    try {
      console.log("Login API:", API_BASE_URL + LOGIN_CONTEXT);

      // Step 1: POST /auth/login — email + password only
      const loginResponse = await axios.post(API_BASE_URL + LOGIN_CONTEXT, {
        email: data.email,
        password: data.password,
      });

      // Login response now includes token + userId + name + email per contract
      const { token, userId, name: userName } = loginResponse.data as {
        token: string;
        userId: string;
        name: string;
        email: string;
      };

      if (!token) {
        setGeneralError("Login failed. No token received.");
        return;
      }

      // Persist immediately — if userId is missing fall back to 'me' (JWT identifies the user)
      const resolvedUserId = userId || 'me';
      await AuthService.saveAuthData(resolvedUserId, token);
      console.log('[Login] Saved auth. userId:', resolvedUserId, '| name:', userName);

      // Navigate to home
      router.replace({
        pathname: "/home",
        params: { username: userName || data.email },
      });
    } catch (error: any) {
      console.error('Login Error:', error);
      if (error?.name === 'AxiosError') {
        setGeneralError(error.response?.data?.message || "Login failed. Please check your credentials.");
      } else {
        setGeneralError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Placeholder for now
    console.log("Google Login pressed");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0B1128]">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View className="px-8 pb-10">

            {/* Header */}
            <View className="mb-12">
              <Text className="text-[#E2E8F0] text-4xl font-extrabold mb-2">Welcome Back,</Text>
              <Text className="text-[#829AC9] text-lg font-medium">Sign in to continue using Chip In.</Text>
            </View>

            {/* Form */}
            <View className="space-y-6">
              {/* Email Input */}
              <View>
                <Text className="text-[#829AC9] mb-2 ml-1 text-sm font-semibold">Email</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`bg-[#131B3A] text-[#E2E8F0] font-medium p-4 rounded-xl border ${errors.email ? 'border-red-500' : 'border-[#24335E]'} focus:border-[#8B5CF6]`}
                      placeholder="Enter your email"
                      placeholderTextColor="#829AC9"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  )}
                />
                {errors.email && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.email.message}</Text>}
              </View>

              {/* Password Input */}
              <View>
                <Text className="text-[#829AC9] mb-2 ml-1 text-sm font-semibold">Password</Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`bg-[#131B3A] text-[#E2E8F0] font-medium p-4 rounded-xl border ${errors.password ? 'border-red-500' : 'border-[#24335E]'} focus:border-[#8B5CF6]`}
                      placeholder="Enter your password"
                      placeholderTextColor="#829AC9"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      secureTextEntry
                    />
                  )}
                />
                {errors.password && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.password.message}</Text>}
              </View>

              {/* Forgot Password Link (Optional but standard) */}
              <TouchableOpacity className="items-end">
                <Text className="text-[#8B5CF6] text-sm font-bold mt-2">Forgot Password?</Text>
              </TouchableOpacity>

              {/* General Error */}
              {generalError && (
                <View className="bg-red-500/20 p-3 rounded-lg border border-red-500/50">
                  <Text className="text-red-400 text-center text-sm">{generalError}</Text>
                </View>
              )}

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleSubmit(onLogin)}
                disabled={loading}
                className={`bg-[#8B5CF6] rounded-xl p-4 items-center shadow-lg shadow-[#8B5CF6]/20 ${loading ? 'opacity-70' : ''}`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View className="flex-row items-center my-8">
              <View className="flex-1 h-[1px] bg-[#24335E]" />
              <Text className="mx-4 text-[#829AC9] text-sm font-semibold">Or continue with</Text>
              <View className="flex-1 h-[1px] bg-[#24335E]" />
            </View>

            {/* Google Login Placeholder */}
            <TouchableOpacity
              onPress={handleGoogleLogin}
              className="flex-row items-center justify-center bg-[#131B3A] rounded-xl p-4 border border-[#24335E] space-x-3 shadow-sm"
            >
              <AntDesign name="google" size={24} color="#8B5CF6" />
              <Text className="text-[#8B5CF6] font-extrabold text-lg">Google</Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-[#829AC9] font-medium">Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/signup')}>
                <Text className="text-[#8B5CF6] font-extrabold">Sign Up</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
