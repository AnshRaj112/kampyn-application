import React, { useEffect, useRef, useState } from "react"; import {
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
  TouchableWithoutFeedback,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import axios from "axios";
import Toast from 'react-native-toast-message';
import { config } from "../../config";
import { saveToken, getToken, removeToken, saveEmail } from "../../utils/storage";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const navigationInProgress = useRef(false);

  // Function to extract email from identifier (if it's an email) or use as is
  const getEmailFromIdentifier = (identifier: string) => {
    return identifier.includes('@') ? identifier : '';
  };

  useEffect(() => {
    const checkLogin = async () => {
      try {
        console.log('Checking for existing token...');
        const token = await getToken();
        console.log('Token found:', !!token);
        // Only redirect to profile if we're on the login page
        if (token && router.canGoBack()) {
          router.back();
        }
      } catch (error) {
        console.error("Error checking login status:", error);
        await removeToken();
      }
    };
    checkLogin();
  }, [router]);

  const handleSubmit = async () => {
    if (navigationInProgress.current) return;

    setError("");
    navigationInProgress.current = true;

    if (!identifier || !password) {
      navigationInProgress.current = false;
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Email/username and password are required.',
        position: 'bottom',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/auth/login`,
        { identifier, password },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 10000,
        }
      );

      const { token, message } = response.data;
      console.log('Login response received. Token present:', !!token);

      if (!token) {
        console.error('No token in response:', message);
        throw new Error(message || 'No token received from server');
      }

      try {
        console.log('Saving token...');
        await saveToken(token);
        console.log('Token saved successfully');

        // Remove isMounted check to prevent navigation blocking

        Toast.show({
          type: 'success',
          text1: 'Login Successful',
          text2: 'Redirecting to home...',
          position: 'bottom',
        });

        // Clear any previous errors
        setError('');

        // Navigate after a short delay
        console.log('Initiating navigation to home...');
        // Get user data to determine university slug for redirect
        try {
          const userResponse = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/auth/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          const userData = userResponse.data;
          const uniId = userData?.uniID || userData?.college?._id;
          
          if (uniId) {
            // Fetch college data to get the slug
            const collegeResponse = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/auth/list`);
            const colleges = collegeResponse.data;
            const userCollege = colleges.find((college: any) => college._id === uniId);
            
            if (userCollege) {
              // Generate slug from college name
              const generateSlug = (name: string): string => {
                return name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, "");
              };
              const collegeSlug = generateSlug(userCollege.fullName);
              console.log('Executing navigation to home with college slug:', collegeSlug);
              router.replace(`/home/${collegeSlug}`);
              return;
            }
          }
        } catch (error) {
          console.error("Error fetching user data for redirect:", error);
        }
        
        // Fallback to generic home page
        console.log('Executing navigation to home');
        router.replace('/home');
      } catch (storageError) {
        console.error('Token storage failed:', storageError);
        throw new Error('Failed to store authentication token');
      }

    } catch (error: any) {
      // Clear any invalid token on error
      await removeToken();

      let errorMessage = 'Login failed. Please try again.';

      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message === 'Failed to store authentication token') {
        errorMessage = 'Failed to save login session. Please try again.';
      }
      console.error('Login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      if (error.response) {
        const { status, data } = error.response;
        if (status === 401) {
          errorMessage = data?.message || 'Invalid email/phone or password';
        } else if (status === 400) {
          errorMessage = data?.message || 'Invalid request';

          // Check if this is an unverified user error
          if (data.message === 'User not verified. OTP sent to email.') {
            let userEmail = '';

            // Try to extract email from redirectTo URL if it exists
            if (data.redirectTo) {
              const url = new URL(`http://dummy${data.redirectTo}`); // dummy domain since we just want to parse the query
              userEmail = url.searchParams.get('email') || '';
            }

            // If still no email, try to use the identifier if it's an email
            if (!userEmail && identifier.includes('@')) {
              userEmail = identifier;
            }

            if (userEmail) {
              // Save the email for OTP verification
              await saveEmail(userEmail);

              // Navigate to OTP verification
              console.log('Redirecting to OTP verification for email:', userEmail);
              router.push({
                pathname: "/otpverification/OtpVerification",
                params: { email: userEmail, from: 'login' }
              });
              navigationInProgress.current = false;
              return;
            } else {
              console.error('No email found for OTP verification');
              errorMessage = 'Unable to verify your account. Please try again.';
            }
          }
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else {
        errorMessage = `Login error: ${error.message}`;
      }

      setError(errorMessage);
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: errorMessage,
        position: 'bottom',
      });

    } finally {
      navigationInProgress.current = false;
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
          <Text style={styles.loginTitle}>Login</Text>

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

            <View style={styles.passwordField}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#8a8a8a"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
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
          </View>

          <TouchableOpacity
            onPress={() => router.push("/forgotpassword/ForgotPassword")}
            style={styles.forgotContainer}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={styles.loginButton}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity> */}

          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={['#4ea199', '#6fc3bd']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButton}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </LinearGradient>
          </Pressable>
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              Don't have an account?{" "}
              <Text
                style={styles.signupLink}
                onPress={() => router.push("/signup/SignupForm")}
              >
                Sign Up
              </Text>
            </Text>
          </View>
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
  loginTitle: {
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
  forgotContainer: {
    alignSelf: "flex-end",
    marginTop: 4,
    marginBottom: 12,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4ea199",
    textDecorationLine: "underline",
  },

  loginButton: {
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
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  registerContainer: {
    marginTop: 20,
  },
  registerText: {
    fontSize: 14,
    color: "#333",
  },
  signupLink: {
    fontWeight: "bold",
    color: "#4ea199",
  },
});
