import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../../config';
import { getToken } from '../../utils/storage';

interface VendorItem {
  itemId: string;
  name: string;
  type?: string;
  price: number;
  image?: string;
  quantity?: number;
  isAvailable?: string;
}

interface VendorData {
  success: boolean;
  foodCourtName: string;
  data: {
    retailItems: VendorItem[];
    produceItems: VendorItem[];
  };
}

interface User {
  _id: string;
  cart?: Array<{
    itemId: string;
    kind: string;
    quantity: number;
  }>;
}

const VendorPage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch vendor data
      const vendorResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/item/getvendors/${id}`);
      const vendorData = await vendorResponse.json();
      
      if (vendorData.success) {
        setVendorData(vendorData);
      }

      // Fetch user data
      const token = await getToken();
      if (token) {
        const userResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/auth/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserData(userData);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert('Error', 'Failed to load vendor data');
    } finally {
      setIsLoading(false);
    }
  };

  const getItemQuantity = (itemId: string, type?: string) => {
    if (!userData?.cart) return 0;
    const kind = type === "retail" ? "Retail" : "Produce";
    const cartItem = userData.cart.find(
      item => item.itemId === itemId && item.kind === kind
    );
    return cartItem?.quantity || 0;
  };

  const handleAddToCart = async (item: VendorItem) => {
    if (!userData) {
      Alert.alert('Error', 'Please login to add items to cart');
      return;
    }

    try {
      const token = await getToken();
      const addResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/cart/add/${userData._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemId: item.itemId,
          quantity: 1,
          vendorId: id,
          kind: item.type === "retail" ? "Retail" : "Produce"
        })
      });

      if (addResponse.ok) {
        // Refresh user data
        const userResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/auth/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (userResponse.ok) {
          const updatedUserData = await userResponse.json();
          setUserData(updatedUserData);
        }
      } else {
        const errorData = await addResponse.json();
        Alert.alert('Error', errorData.message || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const handleIncreaseQuantity = async (item: VendorItem) => {
    if (!userData) return;

    try {
      const token = await getToken();
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/cart/add-one/${userData._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemId: item.itemId,
          kind: item.type === "retail" ? "Retail" : "Produce"
        })
      });

      if (response.ok) {
        // Refresh user data
        const userResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/auth/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (userResponse.ok) {
          const updatedUserData = await userResponse.json();
          setUserData(updatedUserData);
        }
      }
    } catch (error) {
      console.error('Error increasing quantity:', error);
    }
  };

  const handleDecreaseQuantity = async (item: VendorItem) => {
    if (!userData) return;

    try {
      const token = await getToken();
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/cart/remove-one/${userData._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemId: item.itemId,
          kind: item.type === "retail" ? "Retail" : "Produce"
        })
      });

      if (response.ok) {
        // Refresh user data
        const userResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/auth/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (userResponse.ok) {
          const updatedUserData = await userResponse.json();
          setUserData(updatedUserData);
        }
      }
    } catch (error) {
      console.error('Error decreasing quantity:', error);
    }
  };

  const renderItem = ({ item }: { item: VendorItem }) => {
    const quantity = getItemQuantity(item.itemId, item.type);

    return (
      <View style={styles.itemCard}>
        <Image
          source={{ uri: item.image || 'https://via.placeholder.com/120' }}
          style={styles.itemImage}
          resizeMode="cover"
        />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>₹{item.price}</Text>
          
          {item.quantity !== undefined && (
            <Text style={styles.quantity}>Available: {item.quantity}</Text>
          )}
          
          {item.isAvailable && (
            <Text style={[
              styles.availability,
              item.isAvailable === "Y" ? styles.available : styles.unavailable
            ]}>
              {item.isAvailable === "Y" ? "Available" : "Not Available"}
            </Text>
          )}
          
          <View style={styles.cartControls}>
            {quantity > 0 ? (
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleDecreaseQuantity(item)}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleIncreaseQuantity(item)}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddToCart(item)}
              >
                <Text style={styles.addButtonText}>Add to Cart</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const getFilteredItems = () => {
    if (!vendorData) return [];
    
    const allItems = [
      ...(vendorData.data.retailItems || []).map(item => ({ ...item, type: 'retail' })),
      ...(vendorData.data.produceItems || []).map(item => ({ ...item, type: 'produce' }))
    ];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return allItems.filter(item => 
        item.name.toLowerCase().includes(query)
      );
    }

    return allItems;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading vendor menu...</Text>
      </SafeAreaView>
    );
  }

  if (!vendorData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load vendor data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{vendorData.foodCourtName || 'Vendor Menu'}</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push('/cart')}
        >
          <Ionicons name="cart-outline" size={24} color="#007AFF" />
          {userData?.cart && userData.cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{userData.cart.length.toString()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.itemId}
        style={styles.itemsList}
        contentContainerStyle={styles.itemsContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No items found matching your search' : 'No items available'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  cartButton: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    position: 'relative',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInput: {
    height: 44,
    backgroundColor: '#f8f9fa',
    borderRadius: 22,
    paddingHorizontal: 45,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    position: 'absolute',
    left: 35,
    top: 27,
  },
  itemsList: {
    flex: 1,
  },
  itemsContainer: {
    padding: 20,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: 200,
  },
  itemInfo: {
    padding: 15,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 8,
  },
  quantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  availability: {
    fontSize: 14,
    marginBottom: 15,
  },
  available: {
    color: '#28a745',
  },
  unavailable: {
    color: '#dc3545',
  },
  cartControls: {
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 8,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default VendorPage; 