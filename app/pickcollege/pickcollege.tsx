import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PickCollege() {
  const router = useRouter();
  
  const colleges = [
    'MIT Banglore',
    'MIT Jaipur',
    'ITER',
    'KIIT'
  ];

  const handleSelectCollege = (college: string) => {
    router.push({
      pathname: '/signup/SignupForm',
      params: { college },
    });
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={styles.outerContainer}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Select Your College</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <Text style={styles.subtitle}>Choose your college from the list below</Text>
        
        <View style={styles.cardWrapper}>
          <ScrollView style={styles.scrollView}>
            {colleges.map((college, index) => (
              <TouchableOpacity
                key={index}
                style={styles.collegeItem}
                onPress={() => handleSelectCollege(college)}
              >
                <Text style={styles.collegeName}>{college}</Text>
                <Ionicons name="chevron-forward" size={20} color="#8a8a8a" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 65,
  },
  backButton: {
    padding: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  subtitle: {
    color: '#B0B0B0',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cardWrapper: {
    flex: 1,
    backgroundColor: '#F6F6F6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  scrollView: {
    width: '100%',
  },
  collegeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  collegeName: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '600',
  },
});
