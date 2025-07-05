import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  ActivityIndicator,
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";
import axios from "axios";
import { config } from "../../config";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";


export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const handleSubmit = async () => {
    setError("");

    if (!password || !confirmPassword) {
      setError("Both password fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(`${config.backendUrl}/api/user/auth/resetpassword`, {
        email,
        password,
      });

      router.replace("/login/LoginForm");
    } catch (error: any) {
      console.error("Reset Password error:", error);
      setError(error.response?.data?.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidView}
      >
        <View style={styles.box}>
          <Text style={styles.Title}>Reset Password</Text>

          <View style={styles.inputGroup}>
            <View style={styles.passwordField}>
              <TextInput
                style={styles.input}
                placeholder=" New Password"
                placeholderTextColor="#8a8a8a"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color="#4ea199"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordField}>
              <TextInput
                style={styles.input}
                placeholder=" Confirm Password"
                placeholderTextColor="#8a8a8a"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color="#4ea199"
                />
              </TouchableOpacity>
            </View>

          </View>
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={['#4ea199', '#6fc3bd']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.Button}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ButtonText}>Reset Password</Text>
              )}
            </LinearGradient>
          </Pressable>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoidView: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    backgroundColor: "#e5e7eb",
    padding: 30,
    borderRadius: 15,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  Title: {
    fontSize: 28,
    fontWeight: "500",
    marginBottom: 20,
    backgroundClip: "text",

  },
  inputGroup: {
    width: "100%",
    gap: 10,
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderColor: "rgba(78,161,153,0.5)",
    borderWidth: 1,
    color: "#111",
    fontSize: 16,
    marginVertical: 6,
  },
  passwordField: {
    position: "relative",
    width: "100%",
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: 18,
  },
  Button: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    shadowColor: '#4ea199',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 10
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  ButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },


});
