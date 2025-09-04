import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface FormFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
  errorStyle?: TextStyle;
  helperText?: string;
}

export function FormField({
  label,
  error,
  required = false,
  containerStyle,
  labelStyle,
  inputStyle,
  errorStyle,
  helperText,
  ...textInputProps
}: FormFieldProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    labelContainer: {
      flexDirection: "row",
      marginBottom: 8,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    required: {
      color: "#ff6b6b",
      marginLeft: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: error ? "#ff6b6b" : colors.text + "30",
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
    },
    inputFocused: {
      borderColor: error ? "#ff6b6b" : colors.tint,
      borderWidth: 2,
    },
    error: {
      fontSize: 14,
      color: "#ff6b6b",
      marginTop: 4,
    },
    helperText: {
      fontSize: 14,
      color: colors.text + "80",
      marginTop: 4,
    },
  });

  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, labelStyle]}>
            {label}
            {required && <Text style={styles.required}>*</Text>}
          </Text>
        </View>
      )}
      <TextInput
        style={[styles.input, isFocused && styles.inputFocused, inputStyle]}
        onFocus={(e) => {
          setIsFocused(true);
          textInputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          textInputProps.onBlur?.(e);
        }}
        placeholderTextColor={colors.text + "60"}
        {...textInputProps}
      />
      {error && <Text style={[styles.error, errorStyle]}>{error}</Text>}
      {!error && helperText && (
        <Text style={[styles.helperText]}>{helperText}</Text>
      )}
    </View>
  );
}

export default FormField;
