import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,

  Platform,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { CustomToast } from '../CustomToast';
import { LinearGradient } from 'expo-linear-gradient';

export default function SignupStep1() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (!name || !email || !phone) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter name, email, and 10-digit phone number.',
        position: 'bottom',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address.',
        position: 'bottom',
      });
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Phone',
        text2: 'Phone number must be exactly 10 digits.',
        position: 'bottom',
      });
      return;
    }

    router.push({
      pathname: '/signup/password_signup',
      params: {
        name,
        email,
        phone,
        type: 'user-standard' // Default user type
      },
    });
  };

  return (

    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidView}
      >
        <View style={styles.box}>
          <Text style={styles.Title}>Sign Up</Text>
           <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#8a8a8a"
            value={name}
            onChangeText={setName}
          />
  <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#8a8a8a"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

  <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#8a8a8a"
            keyboardType="numeric"
            maxLength={10}
            value={phone}
            // onChangeText={setPhone}
            onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
          ////
          />

          </View>

        <Pressable
          onPress={handleNext}
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
              <Text style={styles.ButtonText}>Next</Text>
            )}
          </LinearGradient>
        </Pressable>
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>
           Already have an account?{" "}
            <Text
              style={styles.signupLink}
              onPress={() => router.push("/login/LoginForm")}
            >
              Login
            </Text>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
     <Toast
        config={{
          error: (props) => <CustomToast {...props} />,
        }}
      />

    </SafeAreaView >
    
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
    marginTop:20
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
