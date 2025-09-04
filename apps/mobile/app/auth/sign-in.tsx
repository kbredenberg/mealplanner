import React from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  useFormValidation,
  signInSchema,
  type SignInFormData,
} from "@/hooks/useFormValidation";
import { useToast } from "@/components/ui/Toast";
import FormField from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const toast = useToast();

  const { values, errors, isSubmitting, setValue, handleSubmit } =
    useFormValidation<SignInFormData>({
      schema: signInSchema,
      onSubmit: async (data) => {
        const result = await signIn(data.email, data.password);

        if (result.success) {
          toast.success("Welcome back!");
          // Navigation will be handled by the auth context and routing
        } else {
          toast.error(result.error || "Sign in failed");
          throw new Error(result.error || "Sign in failed");
        }
      },
    });

  const onSubmit = async () => {
    try {
      await handleSubmit();
    } catch (error) {
      // Error is already handled by the form validation hook and toast
      console.error("Sign in error:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content}>
          <ThemedText style={styles.title}>Welcome Back</ThemedText>
          <ThemedText style={styles.subtitle}>
            Sign in to your account
          </ThemedText>

          <View style={styles.form}>
            <FormField
              label="Email"
              value={values.email || ""}
              onChangeText={(text) => setValue("email", text)}
              error={errors.email}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              required
            />

            <FormField
              label="Password"
              value={values.password || ""}
              onChangeText={(text) => setValue("password", text)}
              error={errors.password}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              required
            />

            <Button
              title="Sign In"
              onPress={onSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              size="large"
              containerStyle={styles.submitButton}
            />
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Don&apos;t have an account?{" "}
              <TouchableOpacity
                onPress={() => router.push("/auth/sign-up" as any)}
              >
                <ThemedText style={[styles.link, { color: colors.tint }]}>
                  Sign Up
                </ThemedText>
              </TouchableOpacity>
            </ThemedText>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    opacity: 0.7,
  },
  form: {
    gap: 20,
  },
  submitButton: {
    marginTop: 8,
  },
  footer: {
    marginTop: 32,
    alignItems: "center",
  },
  footerText: {
    fontSize: 16,
  },
  link: {
    fontWeight: "600",
  },
});
