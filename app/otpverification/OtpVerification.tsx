

import React, { useRef, useState } from "react";
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
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import axios from "axios";
import { config } from "../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function OtpVerificationScreen() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
const inputRefs = useRef<Array<TextInput | null>>([]);

  const router = useRouter();
  const { email, from } = useLocalSearchParams();

  const handleChange = (text: string, index: number) => {
    if (!/^\d?$/.test(text)) return;
    const updatedOtp = [...otp];
    updatedOtp[index] = text;
    setOtp(updatedOtp);

    if (text && index < 5) inputRefs.current[index + 1]?.focus();
    else if (!text && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleSubmit = async () => {
    setError("");
    const fullOtp = otp.join("");

    if (fullOtp.length < 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/auth/otpverification`, {
        email,
        otp: fullOtp,
      });

      if (response.data.token) {
        await AsyncStorage.setItem("token", response.data.token);
      }

      if (from === "forgotpassword") {
        router.push({ pathname: "/resetpassword/ResetPassword", params: { email } });
      } else {
        router.replace("/profile/ProfilePage");
      }
    } catch (error: any) {
      setError(error.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidView}
        >
          <View style={styles.box}>
            <Text style={styles.title}>OTP Verification</Text>
            <Text style={styles.subtitle}>Enter the OTP sent to {email}</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
  inputRefs.current[index] = ref;
}}

                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => handleChange(text, index)}
                  returnKeyType="next"
                  placeholder=" "
                  placeholderTextColor="#aaa"
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>

         
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
   
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20,
    justifyContent: "center",
  },
  keyboardAvoidView: {
    flex: 1,
    justifyContent: "center",
    alignItems:'center'
  },
  box: {
    backgroundColor: "#e5e7eb",
     maxWidth: 400,
    padding: 30,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 10,
    color: "#000",
  },
  subtitle: {
    color: "#666",
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  errorText: {
    color: "red",
    marginBottom: 10,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  otpInput: {
    width: 45,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(78, 161, 153, 0.5)",
    textAlign: "center",
    fontSize: 18,
    color: "#000",
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#4ea199",
    paddingVertical: 14,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    marginTop: 10,
  },
  backText: {
    fontSize: 14,
    color: "#4ea199",
    fontWeight: "600",
  },
});
