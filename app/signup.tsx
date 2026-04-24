import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import Config from '../src/config';
import * as AuthService from '../src/util/authService';

const API_BASE_URL = Config.API_BASE_URL;

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSignup = async (data: SignupFormData) => {
    setLoading(true);
    setGeneralError(null);
    try {
      // POST /auth/signup — name*, email*, password* mandatory; phone optional
      await axios.post(`${API_BASE_URL}/auth/signup`, {
        name: data.name,
        email: data.email,
        password: data.password,
        ...(data.phone ? { phone: data.phone } : {}),
      });

      // After signup, log in automatically
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: data.email,
        password: data.password,
      });

      const { token, userId, name: userName } = loginResponse.data as {
        token: string;
        userId: string;
        name: string;
        email: string;
      };

      if (!token) {
        router.replace('/login');
        return;
      }

      const resolvedUserId = userId || 'me';
      await AuthService.saveAuthData(resolvedUserId, token);

      router.replace({
        pathname: '/home',
        params: { username: userName || data.name },
      });
    } catch (error: any) {
      console.error('Signup Error:', error);
      if (error?.name === 'AxiosError') {
        setGeneralError(error.response?.data?.message || 'Signup failed. Please try again.');
      } else {
        setGeneralError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
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

            {/* Back Button */}
            <TouchableOpacity onPress={() => router.back()} className="mb-8 mt-2 self-start">
              <ArrowLeft size={28} color="#829AC9" />
            </TouchableOpacity>

            {/* Header */}
            <View className="mb-10">
              <Text className="text-[#E2E8F0] text-4xl font-extrabold mb-2">Create Account</Text>
              <Text className="text-[#829AC9] text-lg font-medium">Join Chip In and split smarter.</Text>
            </View>

            {/* Form */}
            <View className="space-y-5">
              {/* Name */}
              <View>
                <Text className="text-[#829AC9] mb-2 ml-1 text-sm font-semibold">Full Name <Text className="text-[#8B5CF6]">*</Text></Text>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`bg-[#131B3A] text-[#E2E8F0] font-medium p-4 rounded-xl border ${errors.name ? 'border-red-500' : 'border-[#24335E]'}`}
                      placeholder="Enter your full name"
                      placeholderTextColor="#829AC9"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="words"
                    />
                  )}
                />
                {errors.name && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.name.message}</Text>}
              </View>

              {/* Email */}
              <View>
                <Text className="text-[#829AC9] mb-2 ml-1 text-sm font-semibold">Email <Text className="text-[#8B5CF6]">*</Text></Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`bg-[#131B3A] text-[#E2E8F0] font-medium p-4 rounded-xl border ${errors.email ? 'border-red-500' : 'border-[#24335E]'}`}
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

              {/* Password */}
              <View>
                <Text className="text-[#829AC9] mb-2 ml-1 text-sm font-semibold">Password <Text className="text-[#8B5CF6]">*</Text></Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`bg-[#131B3A] text-[#E2E8F0] font-medium p-4 rounded-xl border ${errors.password ? 'border-red-500' : 'border-[#24335E]'}`}
                      placeholder="Create a password"
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

              {/* Phone (optional) */}
              <View>
                <Text className="text-[#829AC9] mb-2 ml-1 text-sm font-semibold">Phone <Text className="text-[#4B5E8A] text-xs">(optional)</Text></Text>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="bg-[#131B3A] text-[#E2E8F0] font-medium p-4 rounded-xl border border-[#24335E]"
                      placeholder="Enter your phone number"
                      placeholderTextColor="#829AC9"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      keyboardType="phone-pad"
                    />
                  )}
                />
              </View>

              {/* General Error */}
              {generalError && (
                <View className="bg-red-500/20 p-3 rounded-lg border border-red-500/50">
                  <Text className="text-red-400 text-center text-sm">{generalError}</Text>
                </View>
              )}

              {/* Signup Button */}
              <TouchableOpacity
                onPress={handleSubmit(onSignup)}
                disabled={loading}
                className={`bg-[#8B5CF6] rounded-xl p-4 items-center shadow-lg shadow-[#8B5CF6]/20 mt-2 ${loading ? 'opacity-70' : ''}`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Create Account</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-[#829AC9] font-medium">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/login')}>
                <Text className="text-[#8B5CF6] font-extrabold">Sign In</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
