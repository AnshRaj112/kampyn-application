import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Pressable,
  ActivityIndicator,

} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { CustomToast } from '../CustomToast';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";




export default function SignupStep2() {
  const { name, email, phone, type } = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  const validatePassword = (password: string) => {
    const minLength = /.{8,}/;
    const upper = /[A-Z]/;
    const lower = /[a-z]/;
    const number = /[0-9]/;
    const special = /[^A-Za-z0-9]/;

    return (
      minLength.test(password) &&
      upper.test(password) &&
      lower.test(password) &&
      number.test(password) &&
      special.test(password)
    );
  };


  const handleSubmit = () => {
    if (!password || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in both password fields.',
        position: 'bottom',
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Passwords do not match.',
        position: 'bottom',
      });

      return;
    }
    if (!validatePassword(password)) {

      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Password must be at least 8 characters long, contain uppercase, lowercase, a number, and a special character',
        position: 'bottom',
      });
      return;
    }

    router.push({
      pathname: '/signup/GenderForm',
      params: {
        name,
        email,
        phone,
        type
      }
    });
    // Store password in memory temporarily
    (global as any).tempPassword = password;
  };


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidView}
      >
        <View style={styles.box}>
          <Text style={styles.title}>Sign Up</Text>

          <View style={styles.inputGroup}>
            {/* You can add input fields here if needed */}
          </View>

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

          <View style={styles.passwordField}>
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#8a8a8a"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={22}
                color="#4ea199"
              />
            </TouchableOpacity>
          </View>

          
<View style={styles.buttonRow}>
  <TouchableOpacity
    onPress={() => router.push('/signup/SignupForm')}
    disabled={isLoading}
    style={styles.buttonWrapper}
  >
    <LinearGradient
      colors={['#4ea199', '#6fc3bd']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.button}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>Back</Text>
      )}
    </LinearGradient>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={handleSubmit}
    disabled={isLoading}
    style={styles.buttonWrapper}
  >
    <LinearGradient
      colors={['#4ea199', '#6fc3bd']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.button}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>Next</Text>
      )}
    </LinearGradient>
  </TouchableOpacity>
</View>

        </View>
      </KeyboardAvoidingView>
       <Toast
        config={{
          error: (props) => <CustomToast {...props} />,
          success: (props) => <CustomToast {...props} />,
        }}
      />

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
    marginBottom: 20,
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
  
  buttonWrapper: {
    //width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    flex:1
  },
  buttonRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
  marginTop: 10,
  gap: 10,
  //width:'50%'
},
 
button: {
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

buttonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
  textAlign: 'center',
},

});
