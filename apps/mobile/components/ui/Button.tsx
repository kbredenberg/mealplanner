import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  containerStyle,
  textStyle,
  ...touchableProps
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    };

    // Size styles
    switch (size) {
      case "small":
        baseStyle.paddingHorizontal = 16;
        baseStyle.paddingVertical = 8;
        baseStyle.minHeight = 36;
        break;
      case "large":
        baseStyle.paddingHorizontal = 32;
        baseStyle.paddingVertical = 16;
        baseStyle.minHeight = 56;
        break;
      default: // medium
        baseStyle.paddingHorizontal = 24;
        baseStyle.paddingVertical = 12;
        baseStyle.minHeight = 48;
        break;
    }

    // Variant styles
    switch (variant) {
      case "secondary":
        baseStyle.backgroundColor = colors.text + "20";
        break;
      case "outline":
        baseStyle.backgroundColor = "transparent";
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.tint;
        break;
      case "ghost":
        baseStyle.backgroundColor = "transparent";
        break;
      default: // primary
        baseStyle.backgroundColor = colors.tint;
        break;
    }

    // Disabled styles
    if (isDisabled) {
      baseStyle.opacity = 0.6;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: "600",
    };

    // Size styles
    switch (size) {
      case "small":
        baseStyle.fontSize = 14;
        break;
      case "large":
        baseStyle.fontSize = 18;
        break;
      default: // medium
        baseStyle.fontSize = 16;
        break;
    }

    // Variant styles
    switch (variant) {
      case "secondary":
        baseStyle.color = colors.text;
        break;
      case "outline":
        baseStyle.color = colors.tint;
        break;
      case "ghost":
        baseStyle.color = colors.tint;
        break;
      default: // primary
        baseStyle.color = "white";
        break;
    }

    return baseStyle;
  };

  const styles = StyleSheet.create({
    button: getButtonStyle(),
    text: getTextStyle(),
    loadingContainer: {
      marginRight: 8,
    },
  });

  return (
    <TouchableOpacity
      style={[styles.button, containerStyle]}
      disabled={isDisabled}
      {...touchableProps}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "white" : colors.tint}
          style={styles.loadingContainer}
        />
      )}
      <Text style={[styles.text, textStyle]}>
        {loading ? "Loading..." : title}
      </Text>
    </TouchableOpacity>
  );
}

export default Button;
