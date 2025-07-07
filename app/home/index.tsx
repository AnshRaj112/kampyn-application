import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../../utils/storage';

interface College {
  fullName: string;
  slug?: string;
  _id: string;
}

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const HomePage = () => {
  const router = useRouter();
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const response = await fetch(`${config.backendUrl}/api/user/auth/list`);
        if (!response.ok) {
          throw new Error('Failed to fetch colleges');
        }
        const data = await response.json();
        // Add slugs to the college data
        const collegesWithSlugs = data.map((college: College) => ({
          ...college,
          slug: generateSlug(college.fullName),
        }));
        setColleges(collegesWithSlugs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        Alert.alert('Error', 'Failed to load colleges. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchColleges();
  }, []);

  const handleCollegeClick = async (college: College) => {
    try {
      // Store the college ID in AsyncStorage
      await AsyncStorage.setItem('currentCollegeId', college._id);
      await AsyncStorage.setItem('currentCollegeName', college.fullName);
      await AsyncStorage.setItem('currentCollegeSlug', college.slug || '');
      
      // Navigate to the college-specific page using slug (like frontend)
      router.push({
        pathname: '/home/[slug]',
        params: { slug: college.slug || '' }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save college selection. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Loading colleges...</Text>
        </View>
        <View style={styles.cardWrapper}>
          <ActivityIndicator size="large" color="#4ea199" style={styles.loader} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Error loading colleges</Text>
        </View>
        <View style={styles.cardWrapper}>
          <Text style={styles.error}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Pick your college</Text>
      </View>
      
      <View style={styles.cardWrapper}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {colleges
            .filter((college) => college.slug)
            .map((college) => (
              <TouchableOpacity
                key={college._id}
                style={styles.collegeItem}
                onPress={() => handleCollegeClick(college)}
                activeOpacity={0.7}
              >
                <Text style={styles.collegeName} numberOfLines={2}>
                  {college.fullName}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#8a8a8a" />
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  collegeName: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  error: {
    textAlign: 'center',
    color: '#ef4444',
    fontSize: 18,
    marginTop: 16,
  },
  loader: {
    marginTop: 20,
  },
});

export default HomePage; 