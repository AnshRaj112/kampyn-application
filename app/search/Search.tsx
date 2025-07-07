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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../../config';
import { getToken } from '../../utils/storage';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface CartItem {
  _id: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  kind: string;
  vendorId: string;
}

interface SearchItem {
  _id: string;
  name: string;
  price: number;
  image?: string;
  kind: string;
  isVendor?: boolean;
  vendorId?: string;
  location?: string;
}

interface SearchResult {
  items: SearchItem[];
  vendors: SearchItem[];
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult>({ items: [], vendors: [] });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [collegeId, setCollegeId] = useState('');
  const [cart, setCart] = useState<{[key: string]: number}>({});
  const [userId, setUserId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initializePage = async () => {
      try {
        // Check login status
        const token = await getToken();
        setIsLoggedIn(!!token);

        // Get college ID from storage
        const storedCollegeId = await AsyncStorage.getItem('currentCollegeId');
        setCollegeId(storedCollegeId || '');

        // Get user ID if logged in
        if (token) {
          const response = await fetch(`${config.backendUrl}/api/user/auth/user`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const userData = await response.json();
            setUserId(userData._id);
            setUserData(userData);
            // Fetch cart
            await fetchCart(userData._id);
          }
        }
      } catch (error) {
        console.error('Error initializing search page:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    initializePage();
  }, []);

  const fetchCart = async (currentUserId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${config.backendUrl}/cart/${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const cartData = await response.json();
        const cartMap: {[key: string]: number} = {};
        cartData.cart?.forEach((item: any) => {
          cartMap[item.itemId] = item.quantity;
        });
        setCart(cartMap);
        setCartItems(cartData.cart || []);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  // Real-time search with debouncing
  useEffect(() => {
    console.log('📝 Query changed to:', query);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (query.trim()) {
      console.log('⏰ Setting search timeout...');
      const timeout = setTimeout(() => {
        console.log('🚀 Executing search...');
        performSearch();
      }, 300); // 300ms debounce
      setSearchTimeout(timeout);
    } else {
      console.log('🗑️ Clearing results');
      setSearchResults({ items: [], vendors: [] });
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [query]);

  const performSearch = async () => {
    if (!query.trim()) return;

    console.log('🔍 Performing search for:', query);
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        console.log('❌ No token found');
        return;
      }

      // Get college ID from storage
      const collegeId = await AsyncStorage.getItem('currentCollegeId');
      console.log('🏫 College ID:', collegeId);
      if (!collegeId) {
        Alert.alert('Error', 'Please select a college first');
        return;
      }

      // Search both items and vendors
      const itemsUrl = `${config.backendUrl}/api/item/search/items?query=${encodeURIComponent(query)}&uniID=${collegeId}&searchByType=true`;
      const vendorsUrl = `${config.backendUrl}/api/item/search/vendors?query=${encodeURIComponent(query)}&uniID=${collegeId}`;
      
      console.log('🔗 Items URL:', itemsUrl);
      console.log('🔗 Vendors URL:', vendorsUrl);
      
      const [itemsResponse, vendorsResponse] = await Promise.all([
        fetch(itemsUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(vendorsUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      console.log('📊 Items response status:', itemsResponse.status);
      console.log('📊 Vendors response status:', vendorsResponse.status);
      
      let items: SearchItem[] = [];
      let vendors: SearchItem[] = [];

      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        console.log('📦 Items data:', itemsData);
        if (Array.isArray(itemsData)) {
          items = itemsData.filter((item: any) => !item.isTypeMatch);
        }
      } else {
        console.log('❌ Items response error:', itemsResponse.status, itemsResponse.statusText);
      }

      if (vendorsResponse.ok) {
        const vendorsData = await vendorsResponse.json();
        console.log('🏪 Vendors data:', vendorsData);
        if (Array.isArray(vendorsData)) {
          vendors = vendorsData.map((vendor: any) => ({
            ...vendor,
            isVendor: true,
            name: vendor.name || vendor.foodCourtName,
            price: vendor.price || 0,
            image: vendor.image || '/images/coffee.jpeg'
          }));
        }
      } else {
        console.log('❌ Vendors response error:', vendorsResponse.status, vendorsResponse.statusText);
      }

      setSearchResults({ items, vendors });
    } catch (error) {
      console.error('Error performing search:', error);
      Alert.alert('Error', 'Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getVendorsForItem = async (item: SearchItem) => {
    try {
      const token = await getToken();
      if (!token) return [];

      const response = await fetch(`${config.backendUrl}/api/item/vendors/${item._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.vendors || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching vendors:', error);
      return [];
    }
  };

  const addToCart = async (item: SearchItem) => {
    if (!userData) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    try {
      const vendors = await getVendorsForItem(item);
      
      if (vendors.length === 0) {
        Alert.alert('Error', 'No vendors available for this item');
        return;
      }

      if (vendors.length === 1) {
        // Add directly to cart
        await addItemToCart(item, vendors[0]._id);
      } else {
        // Show vendor selection
        const vendorNames = vendors.map((v: any) => v.name);
        Alert.alert(
          'Select Vendor',
          'Choose a vendor for this item:',
          vendorNames.map((name: string, index: number) => ({
            text: name,
            onPress: () => addItemToCart(item, vendors[index]._id)
          }))
        );
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const addItemToCart = async (item: SearchItem, vendorId: string) => {
    try {
      const token = await getToken();
      if (!token || !userData) return;

      const addResponse = await fetch(`${config.backendUrl}/cart/add/${userData._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemId: item._id,
          quantity: 1,
          vendorId: vendorId,
          kind: item.kind
        })
      });

      if (addResponse.ok) {
        Alert.alert('Success', 'Item added to cart!');
        fetchCart(userData._id); // Refresh cart
      } else {
        const errorData = await addResponse.json();
        Alert.alert('Error', errorData.message || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const increaseQuantity = async (item: SearchItem) => {
    try {
      const token = await getToken();
      if (!token || !userData) return;

      const response = await fetch(`${config.backendUrl}/cart/add-one/${userData._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemId: item._id,
          kind: item.kind
        })
      });

      if (response.ok) {
        fetchCart(userData._id); // Refresh cart
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to increase quantity');
      }
    } catch (error) {
      console.error('Error increasing quantity:', error);
      Alert.alert('Error', 'Failed to increase quantity');
    }
  };

  const decreaseQuantity = async (item: SearchItem) => {
    try {
      const token = await getToken();
      if (!token || !userData) return;

      const response = await fetch(`${config.backendUrl}/cart/remove-one/${userData._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemId: item._id,
          kind: item.kind
        })
      });

      if (response.ok) {
        fetchCart(userData._id); // Refresh cart
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to decrease quantity');
      }
    } catch (error) {
      console.error('Error decreasing quantity:', error);
      Alert.alert('Error', 'Failed to decrease quantity');
    }
  };

  const getCartItemQuantity = (itemId: string) => {
    const cartItem = cartItems.find(item => item.itemId === itemId);
    return cartItem?.quantity || 0;
  };

  const renderSearchItem = ({ item }: { item: SearchItem }) => {
    const quantity = getCartItemQuantity(item._id);
    const isVendor = item.isVendor;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemInfo}>
          <Image
            source={{ uri: item.image || 'https://via.placeholder.com/60' }}
            style={styles.itemImage}
            resizeMode="cover"
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            {!isVendor && (
              <Text style={styles.itemPrice}>₹{item.price}</Text>
            )}
            {isVendor && item.location && (
              <Text style={styles.itemLocation}>{item.location}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.itemActions}>
          {isVendor ? (
            <TouchableOpacity
              style={styles.vendorButton}
              onPress={() => {
                // Navigate to vendor page
                router.push({
                  pathname: '/vendor/[id]',
                  params: { id: item._id }
                });
              }}
            >
              <Text style={styles.vendorButtonText}>View Menu</Text>
            </TouchableOpacity>
          ) : quantity > 0 ? (
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => decreaseQuantity(item)}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => increaseQuantity(item)}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addToCart(item)}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderSection = (title: string, data: SearchItem[]) => {
    if (data.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <FlatList
          data={data}
          renderItem={renderSearchItem}
          keyExtractor={(item) => item._id}
          horizontal={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search</Text>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push('/cart')}
          >
            <Ionicons name="cart-outline" size={24} color="#fff" />
            {cartItems.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ea199" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push('/cart')}
        >
          <Ionicons name="cart-outline" size={24} color="#fff" />
          {cartItems.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for food or vendors..."
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => {}}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
        {query.trim() === '' ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Start typing to search for food items and vendors...
            </Text>
          </View>
        ) : searchResults.vendors.length === 0 && searchResults.items.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No results found</Text>
            <Text style={styles.emptyStateSubtext}>Try different keywords</Text>
          </View>
        ) : (
          <>
            {renderSection('Food Courts', searchResults.vendors)}
            {renderSection('Food Items', searchResults.items)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#4ea199',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
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
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 12,
  },
  searchButton: {
    backgroundColor: '#4ea199',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4ea199',
    marginBottom: 4,
  },
  itemLocation: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  itemActions: {
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quantityButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#4ea199',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#4ea199',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  vendorButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  vendorButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '600',
    color: '#4ea199',
  },
});
