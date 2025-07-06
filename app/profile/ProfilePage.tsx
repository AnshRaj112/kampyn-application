import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
  Entypo,
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getToken, removeToken } from '../../utils/storage';
import { config } from '../../config';
import Toast from 'react-native-toast-message';

const BACKEND_URL = config.backendUrl;

export default function ProfileScreen() {
  const router = useRouter();
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [user, setUser] = useState<{ fullName: string; email: string; phone: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = await getToken();
      if (!token) {
        await removeToken();
        router.replace('/login/LoginForm');
        return;
      }

      try {
        const response = await fetch(`${BACKEND_URL}/api/user/auth/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          await removeToken();
          router.replace('/login/LoginForm');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch user data. Please try again.',
          position: 'bottom',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    Toast.show({
      type: 'info',
      text1: 'Logging out...',
      text2: 'You are being logged out.',
      position: 'bottom',
    });
    await performLogout();
  };

  const performLogout = async () => {
    try {
      const token = await getToken();
      await removeToken();
      if (token) {
        try {
          await fetch(`${BACKEND_URL}/api/user/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.warn('Logout API call failed, but proceeding with client-side logout', error);
        }
      }
      Toast.show({
        type: 'success',
        text1: 'Logged out',
        text2: 'You have been logged out successfully.',
        position: 'bottom',
      });
      router.replace('/login/LoginForm');
    } catch (error) {
      console.error('Logout error:', error);
      Toast.show({
        type: 'error',
        text1: 'Logout Failed',
        text2: 'An error occurred during logout.',
        position: 'bottom',
      });
      router.replace('/login/LoginForm');
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
      bounces={true}
      alwaysBounceVertical={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.push('/home')}>
        <Ionicons name="chevron-back" size={24} color="#009688" />
        <Text style={styles.backText}>Profile</Text>
      </TouchableOpacity>

      <Text style={styles.userName}>{user?.fullName ?? 'Loading...'}</Text>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.item}
          onPress={() => setShowPersonalInfo(!showPersonalInfo)}
        >
          <Ionicons name="person-outline" size={20} color="#009688" />
          <Text style={styles.itemText}>Personal Info</Text>
          <Ionicons
            name={showPersonalInfo ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color="#777"
          />
        </TouchableOpacity>

        {showPersonalInfo && (
          <View style={styles.subInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={18} color="#009688" />
              <View style={styles.infoText}>
                <Text style={styles.label}>FULL NAME</Text>
                <Text style={styles.value}>{user?.fullName ?? '-'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="mail" size={18} color="#5B96F0" />
              <View style={styles.infoText}>
                <Text style={styles.label}>EMAIL</Text>
                <Text style={styles.value}>{user?.email ?? '-'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="call" size={18} color="#00C2B2" />
              <View style={styles.infoText}>
                <Text style={styles.label}>PHONE NUMBER</Text>
                <Text style={styles.value}>+91 {user?.phone ?? '-'}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push('/cart')}
        >
          <MaterialIcons name="shopping-cart" size={20} color="#5B96F0" />
          <Text style={styles.itemText}>Cart</Text>
          <Ionicons name="chevron-forward" size={20} color="#777" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push('/activeorders')}
        >
          <MaterialIcons name="assignment" size={20} color="#10b981" />
          <Text style={styles.itemText}>Active Orders</Text>
          <Ionicons name="chevron-forward" size={20} color="#777" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push('/pastorders')}
        >
          <MaterialIcons name="history" size={20} color="#3b82f6" />
          <Text style={styles.itemText}>Past Orders</Text>
          <Ionicons name="chevron-forward" size={20} color="#777" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            router.push('/fav/FavouritePage');
          }}
        >
          <FontAwesome5 name="heart" size={18} color="#D26AFF" />
          <Text style={styles.itemText}>Favourite</Text>
          <Ionicons name="chevron-forward" size={20} color="#777" />
        </TouchableOpacity>

      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.item} onPress={()=>router.push('/terms/TermsPage')}>
          <Entypo name="help" size={20} color="#FF6347" />
          <Text style={styles.itemText}>FAQs</Text>
          <Ionicons name="chevron-forward" size={20} color="#777" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/about/AboutPage')}>
          <Feather name="info" size={20} color="#00CED1" />
          <Text style={styles.itemText}>About Us</Text>
          <Ionicons name="chevron-forward" size={20} color="#777" />
          
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={()=>router.push('/help/HelpPage')}>
          <Ionicons name="mail-open-outline" size={20} color="#8A2BE2" />
          <Text style={styles.itemText}>Contact Us</Text>
          <Ionicons name="chevron-forward" size={20} color="#777" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.item} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#FF4D4D" />
          <Text style={styles.itemText}>Log Out</Text>
          <Ionicons name="chevron-forward" size={20} color="#777" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    marginLeft: 4,
    fontSize: 16,
    color: '#1a1a2e',
    fontWeight: '600',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 24,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#F6F6F6',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  itemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  subInfo: {
    padding: 12,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    marginLeft: 10,
  },
  label: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
  },
});
