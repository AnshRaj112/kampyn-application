import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Pressable
} from 'react-native';
import Toast from 'react-native-toast-message';
import { CustomToast } from '../CustomToast';
import axios from 'axios';
import { config } from '../../config';
import { LinearGradient } from 'expo-linear-gradient';

export default function Help() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (!name || !email || !message) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill out all fields.',
        position: 'bottom',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid email address.',
        position: 'bottom',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(`${config.backendUrl}/contact`, {
        name,
        email,
        message,
      });

      Toast.show({
        type: 'success',
        text1: 'Message sent successfully!',
        text2: response.data.message,
        position: 'bottom',
      });

      // Clear form after successful submission
      setName('');
      setEmail('');
      setMessage('');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to send message. Please try again.',
        position: 'bottom',
      });
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
          <Text style={styles.Title}>Contact Us</Text>

          <View style={styles.inputGroup}>

            <TextInput
              style={styles.input}
              placeholder="Your Name"
              placeholderTextColor="#8a8a8a"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Your Email"
              placeholderTextColor="#8a8a8a"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
 style={styles.messageInput}
               placeholder="Your Message"
              placeholderTextColor="#8a8a8a"
              value={message}
              onChangeText={setMessage}
              multiline={true}
              numberOfLines={5}
              textAlignVertical="top"
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
                <Text style={styles.ButtonText}>Send</Text>
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
  
  messageInput: {
   
  backgroundColor: "#fff",
  padding: 12,
  borderRadius: 8,
  borderColor: "rgba(78,161,153,0.5)",
  borderWidth: 1,
  color: "#111",
  fontSize: 16,
  marginVertical: 6,
  width: "100%",
  minHeight: 130,  // << increased from 100 to 130


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
    marginTop:10
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
