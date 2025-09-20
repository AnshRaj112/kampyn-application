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
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../../config';
import { getToken } from '../../utils/storage';

interface User {
  _id: string;
  name: string;
  email: string;
  cart?: Array<{
    itemId: string;
    kind: string;
    quantity: number;
  }>;
  favourites?: Array<{
    itemId: string;
    vendorId: string;
    kind: string;
  }>;
}

interface VendorItem {
  itemId: string;
  name: string;
  type?: string;
  price: number;
  image?: string;
  quantity?: number;
  isAvailable?: string;
  vendorId?: string;
}

interface VendorData {
  success: boolean;
  foodCourtName: string;
  data: {
    retailItems: VendorItem[];
    produceItems: VendorItem[];
  };
  uniID?: string;
}

const VendorPage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<VendorItem[]>([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    filterItems();
  }, [vendorData, selectedType, searchQuery]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch vendor data
      const vendorResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/item/getvendors/${id}`);
      const vendorData = await vendorResponse.json();
      
      if (vendorData.success) {
        // Add type information to items
        const retailItems = vendorData.data.retailItems.map((item: VendorItem) => ({
          ...item,
          type: "retail"
        }));
        const produceItems = vendorData.data.produceItems.map((item: VendorItem) => ({
          ...item,
          type: "produce"
        }));
        
        setVendorData({
          ...vendorData,
          data: {
            retailItems,
            produceItems
          }
        });
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

  const filterItems = () => {
    if (!vendorData) return;

    const allItems = [
      ...(vendorData.data.retailItems || []),
      ...(vendorData.data.produceItems || [])
    ];

    let filtered = allItems;

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  };

  const getItemQuantity = (itemId: string, type?: string) => {
    if (!userData?.cart) return 0;
    const kind = type === "retail" ? "Retail" : "Produce";
    const cartItem = userData.cart.find(
      item => item.itemId === itemId && item.kind === kind
    );
    return cartItem?.quantity || 0;
  };

  const isItemFavourited = (item: VendorItem) => {
    if (!userData?.favourites) return false;
    return userData.favourites.some(
      (fav) =>
        String(fav.itemId) === String(item.itemId) &&
        String(fav.vendorId) === String(id) &&
        fav.kind === (item.type === "retail" ? "Retail" : "Produce")
    );
  };

  const toggleFavourite = async (item: VendorItem) => {
    if (!userData) {
      Alert.alert('Error', 'Please login to favourite items');
      return;
    }

    const kind = item.type === "retail" ? "Retail" : "Produce";
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/fav/${userData._id}/${item.itemId}/${kind}/${id}`, {
        method: "PATCH",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || "Failed to update favourites");
      } else {
        // Refresh user data to get updated favourites
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
    } catch (err) {
      console.error("Favourite toggle error:", err);
      Alert.alert('Error', 'Error updating favourites');
    }
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
        // Refresh user data to update cart
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
        // Refresh user data to update cart
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
        // Refresh user data to update cart
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
    const isFav = isItemFavourited(item);

    return (
      <View style={styles.itemCard}>
        <Image
          source={{ uri: item.image || 'https://via.placeholder.com/120' }}
          style={styles.itemImage}
          resizeMode="cover"
        />
        
        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            <TouchableOpacity
              style={styles.favouriteButton}
              onPress={() => toggleFavourite(item)}
            >
              <Ionicons 
                name={isFav ? "heart" : "heart-outline"} 
                size={20} 
                color={isFav ? "#e74c3c" : "#666"} 
              />
            </TouchableOpacity>
          </View>
          
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

  const getUniqueTypes = () => {
    if (!vendorData) return [];
    const allItems = [
      ...(vendorData.data.retailItems || []),
      ...(vendorData.data.produceItems || [])
    ];
    return Array.from(new Set(allItems.map(item => item.type).filter(Boolean)));
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

  const uniqueTypes = getUniqueTypes();

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

      {uniqueTypes.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.typeFilters}
          contentContainerStyle={styles.typeFiltersContent}
        >
          <TouchableOpacity
            style={[styles.typeButton, !selectedType && styles.activeTypeButton]}
            onPress={() => setSelectedType(null)}
          >
            <Text style={[styles.typeButtonText, !selectedType && styles.activeTypeButtonText]}>
              All
            </Text>
          </TouchableOpacity>
          {uniqueTypes.map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, selectedType === type && styles.activeTypeButton]}
              onPress={() => setSelectedType(type || null)}
            >
              <Text style={[styles.typeButtonText, selectedType === type && styles.activeTypeButtonText]}>
                {type ? type.charAt(0).toUpperCase() + type.slice(1) : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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
    marginTop:30
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
  typeFilters: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    maxHeight:60,
  },
  typeFiltersContent: {
    // paddingHorizontal: 20,
    // paddingVertical: 15,
     flexDirection: 'row',     // Ensures horizontal layout
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 10,
  gap: 8,        
  },
  typeButton: {
    // paddingHorizontal: 10,
    // paddingVertical: 2,
    // borderRadius: 20,
    // backgroundColor: '#f8f9fa',
    // marginRight: 10,
    // borderWidth: 1,
    // borderColor: '#e9ecef',
    paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 20,
  backgroundColor: '#f8f9fa',
  borderWidth: 1,
  borderColor: '#e9ecef',
  minWidth: 70,            // Force a smaller consistent width
  alignItems: 'center',
  },
  activeTypeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTypeButtonText: {
    color: '#fff',
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 10,
  },
  favouriteButton: {
    padding: 4,
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