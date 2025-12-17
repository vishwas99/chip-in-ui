import React from "react";
import { View, TextInput, Text, StyleSheet } from "react-native";
import { Controller } from "react-hook-form";

interface InputFieldProps {
  name: string;
  placeholder: string;
  control: any;
  error?: string;
  secureTextEntry?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ name, placeholder, control, error, secureTextEntry }) => {
  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            secureTextEntry={secureTextEntry}
            placeholderTextColor={"gray"}
          />
        )}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
    container: { marginBottom: 10, color: "white" },
    input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 10, fontSize: 16, color: "#ffff" },
    error: { color: "red", fontSize: 14, marginTop: 5 },
  });

export default InputField;
