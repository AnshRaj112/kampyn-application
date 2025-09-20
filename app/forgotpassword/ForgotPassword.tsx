import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { config } from '../config';
import { LinearGradient } from 'expo-linear-gradient';

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!identifier) {
      setError('Email or phone number is required.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/auth/forgotpassword`, {
        identifier,
      });

      setSuccess('OTP has been sent to your email. Please check your inbox.');
      router.push({
        pathname: '/otpverification/OtpVerification',
        params: { email: identifier, from: 'forgotpassword' },
      });
    } catch (error: any) {
      console.error('Forgot Password error:', error);
      setError(error.response?.data?.message || 'Failed to send OTP. Please try again.');
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
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.desc}>Enter your email or phone number to receive a password reset email.</Text>


          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Email or Phone"
              placeholderTextColor="#8a8a8a"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
            />


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
                <Text style={styles.ButtonText}>Send OTP</Text>
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
  title: {
    fontSize: 28,
    fontWeight: "500",
    marginBottom: 20,

    backgroundClip: "text",

  },
  desc: {
    color: '#666666', 
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center', 
   


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
    marginBottom: 20
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
