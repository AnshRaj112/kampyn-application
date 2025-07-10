import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  Alert,
  RefreshControl
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getToken } from '../../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../../config';
import VendorModal from './VendorModal';

interface Item {
  _id: string;
  name: string;
  price: number;
  image?: string;
  type: string;
  packable: boolean;
  category: 'retail' | 'produce';
  isSpecial?: string;
  vendorId?: string;
  quantity?: number;
  isAvailable?: string;
}

interface Category {
  name: string;
  type: string;
  category: 'retail' | 'produce';
}

interface GroupedItems {
  [key: string]: Item[];
}

interface Vendor {
  _id: string;
  name: string;
  price: number;
  quantity?: number;
  isAvailable?: string;
  inventoryValue?: {
    price: number;
    quantity?: number;
    isAvailable?: string;
    isSpecial?: string;
  };
}

export default function CollegePage() {
  const router = useRouter();
  const { slug } = useLocalSearchParams();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collegeName, setCollegeName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [userId, setUserId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<GroupedItems>({});
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [specialItems, setSpecialItems] = useState<Item[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<{[key: string]: number}>({});
  const [refreshing, setRefreshing] = useState(false);
  
  // Vendor modal state
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    const initializePage = async () => {
      try {
        // Check login status
        const token = await getToken();
        console.log('Token check:', { hasToken: !!token, token: token ? 'exists' : 'null' });
        setIsLoggedIn(!!token);

        // Get college data from storage
        const storedCollegeName = await AsyncStorage.getItem('currentCollegeName');
        const storedCollegeId = await AsyncStorage.getItem('currentCollegeId');
        const storedUserId = await AsyncStorage.getItem('userId');
        
        console.log('Stored data:', { 
          collegeName: storedCollegeName, 
          collegeId: storedCollegeId, 
          userId: storedUserId 
        });
        
        setCollegeName(storedCollegeName || 'Your College');
        setCollegeId(storedCollegeId || '');
        setUserId(storedUserId || '');

        if (storedCollegeId) {
          await fetchAllItems(storedCollegeId);
          // Don't call fetchFavoriteItems here - it will be called in the useEffect below
          await fetchCart();
        }
      } catch (error) {
        console.error('Error initializing college page:', error);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [slug, router]);

  // Function to fetch user data and set userId
  const fetchUserData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        console.log('No token found, skipping user data fetch');
        return;
      }

      console.log('Fetching user data...');
      const response = await fetch(`${config.backendUrl}/api/user/auth/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('User data fetched:', userData);
        setUserId(userData._id);
        
        // Save userId to storage for future use
        await AsyncStorage.setItem('userId', userData._id);
        
        // Now fetch favorites since we have the userId
        if (collegeId) {
          await fetchFavoriteItems(collegeId);
        }
      } else {
        console.error('Failed to fetch user data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Separate useEffect to fetch user data and favorites when logged in
  useEffect(() => {
    if (isLoggedIn && collegeId) {
      console.log('User logged in, fetching user data and favorites');
      fetchUserData();
    } else {
      console.log('Not fetching user data - missing state:', { isLoggedIn, collegeId });
    }
  }, [isLoggedIn, collegeId]);

  const fetchAllItems = async (uniId: string) => {
    try {
              // Fetch all retail and produce items for the university (like frontend)
        const [retailRes, produceRes] = await Promise.all([
          fetch(`${config.backendUrl}/api/item/retail/uni/${uniId}?limit=1000`),
          fetch(`${config.backendUrl}/api/item/produce/uni/${uniId}?limit=1000`),
        ]);
      
      const retailData = await retailRes.json();
      const produceData = await produceRes.json();
      
      if (!retailRes.ok) {
        console.error('Retail API error:', retailRes.status, retailData);
        throw new Error(`Failed to fetch retail items: ${retailRes.status}`);
      }
      if (!produceRes.ok) {
        console.error('Produce API error:', produceRes.status, produceData);
        throw new Error(`Failed to fetch produce items: ${produceRes.status}`);
      }
      
      const retailItems: Item[] = (retailData.items || []).map((item: any) => ({
        _id: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        type: item.type,
        packable: item.packable || false,
        category: 'retail' as const,
        isSpecial: item.isSpecial,
        vendorId: item.vendorId,
        quantity: item.quantity,
      }));
      
      const produceItems: Item[] = (produceData.items || []).map((item: any) => ({
        _id: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        type: item.type,
        packable: item.packable || false,
        category: 'produce' as const,
        isSpecial: item.isSpecial,
        vendorId: item.vendorId,
        isAvailable: item.isAvailable,
      }));

      // Group by category-type (like frontend)
      const groupedItems: GroupedItems = {};
      [...retailItems, ...produceItems].forEach(item => {
        const key = `${item.category}-${item.type}`;
        if (!groupedItems[key]) groupedItems[key] = [];
        groupedItems[key].push(item);
      });

      setItems(groupedItems);
      setAllItems([...retailItems, ...produceItems]);
      
      console.log('Fetched items:', {
        retailItems: retailItems.length,
        produceItems: produceItems.length,
        groupedItems: Object.keys(groupedItems),
        totalItems: retailItems.length + produceItems.length,
        retailData: retailData,
        produceData: produceData
      });
      
      // Set categories for display
      const retailCategories = retailItems.reduce((acc: Category[], item) => {
        if (!acc.find(cat => cat.type === item.type)) {
          acc.push({
            name: item.type,
            type: item.type,
            category: 'retail'
          });
        }
        return acc;
      }, []);
      
      const produceCategories = produceItems.reduce((acc: Category[], item) => {
        if (!acc.find(cat => cat.type === item.type)) {
          acc.push({
            name: item.type,
            type: item.type,
            category: 'produce'
          });
        }
        return acc;
      }, []);
      
      setCategories([...retailCategories, ...produceCategories]);
      
      // Fetch special items
      await fetchSpecialItems(uniId, [], []); // Pass empty arrays since fetchSpecialItems now fetches its own data
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchSpecialItems = async (uniId: string, retailItems: Item[], produceItems: Item[]) => {
    try {
      // Fetch vendors and all items in parallel (like frontend)
      const [vendorsRes, retailRes, produceRes] = await Promise.all([
        fetch(`${config.backendUrl}/api/vendor/list/uni/${uniId}`),
        fetch(`${config.backendUrl}/api/item/retail/uni/${uniId}?limit=1000`),
        fetch(`${config.backendUrl}/api/item/produce/uni/${uniId}?limit=1000`),
      ]);
      
      const vendors = await vendorsRes.json();
      const retailData = await retailRes.json();
      const produceData = await produceRes.json();
      
      if (!vendorsRes.ok || !retailRes.ok || !produceRes.ok) {
        throw new Error("Failed to fetch vendor or item data");
      }
      
      // Create lookup maps for items
      const retailItemsMap = new Map<string, any>();
      const produceItemsMap = new Map<string, any>();
      
      (retailData.items || []).forEach((item: any) => {
        retailItemsMap.set(item._id, item);
      });
      
      (produceData.items || []).forEach((item: any) => {
        produceItemsMap.set(item._id, item);
      });
      
      const specials: Item[] = [];
      
      vendors.forEach((vendor: any) => {
        // Process retail inventory
        (vendor.retailInventory || []).forEach((entry: any) => {
          if (entry.isSpecial && entry.isSpecial === 'Y') {
            const itemData = retailItemsMap.get(entry.itemId);
            if (itemData) {
              specials.push({
                _id: entry.itemId,
                name: itemData.name || '',
                image: itemData.image || '',
                type: itemData.type || 'retail',
                packable: itemData.packable || false,
                category: 'retail' as const,
                isSpecial: 'Y',
                price: itemData.price || 0,
                vendorId: vendor._id,
                quantity: entry.quantity || 0,
              });
            }
          }
        });
        
        // Process produce inventory
        (vendor.produceInventory || []).forEach((entry: any) => {
          if (entry.isSpecial && entry.isSpecial === 'Y') {
            const itemData = produceItemsMap.get(entry.itemId);
            if (itemData) {
              specials.push({
                _id: entry.itemId,
                name: itemData.name || '',
                image: itemData.image || '',
                type: itemData.type || 'produce',
                packable: itemData.packable || false,
                category: 'produce' as const,
                isSpecial: 'Y',
                price: itemData.price || 0,
                vendorId: vendor._id,
                isAvailable: entry.isAvailable || 'N',
              });
            }
          }
        });
      });
      
      setSpecialItems(specials);
      console.log('Fetched special items:', {
        count: specials.length,
        specials: specials,
        vendors: vendors.length,
        retailData: retailData,
        produceData: produceData
      });
    } catch (error) {
      console.error('Error fetching special items:', error);
    }
  };

  const fetchFavoriteItems = async (uniId: string) => {
    console.log('=== fetchFavoriteItems called ===');
    console.log('Parameters:', { uniId });
    
    // Get current userId from state or storage
    const currentUserId = userId || await AsyncStorage.getItem('userId');
    console.log('Current userId:', currentUserId);
    
    if (!currentUserId) {
      console.log('❌ Skipping favorites fetch - no userId available');
      return;
    }
    
    try {
      const token = await getToken();
      const response = await fetch(`${config.backendUrl}/fav/${currentUserId}/${uniId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const favoritesData = await response.json();
        console.log('Favorites API response:', favoritesData);
        // Convert favorite items to match our Item interface
        const favorites = favoritesData.favourites?.map((fav: any) => ({
          _id: fav._id,
          name: fav.name,
          price: fav.price,
          image: fav.image,
          type: fav.type,
          packable: false,
          category: fav.kind === 'Retail' ? 'retail' : 'produce',
          isSpecial: fav.isSpecial,
          vendorId: fav.vendorId
        })) || [];
        
        setFavoriteItems(favorites);
        console.log('Fetched favorite items:', favorites.length, favorites);
      } else {
        console.error('Favorites API error:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error fetching favorite items:', error);
    }
  };

  const fetchCart = async () => {
    const currentUserId = userId || await AsyncStorage.getItem('userId');
    if (!currentUserId) return;
    
    try {
      const token = await getToken();
      const response = await fetch(`${config.backendUrl}/cart/${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const cartData = await response.json();
        console.log('Cart data received:', cartData);
        const cartMap: {[key: string]: number} = {};
        cartData.cart?.forEach((item: any) => {
          cartMap[item.itemId] = item.quantity;
        });
        console.log('Cart map created:', cartMap);
        setCart(cartMap);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const checkItemAvailability = async (item: Item): Promise<Vendor[]> => {
    try {
      const token = await getToken();
      const response = await fetch(`${config.backendUrl}/api/item/vendors/${item._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }

      const vendors = await response.json();
      
      // Filter available vendors based on item type
      const availableVendors = vendors.filter((vendor: Vendor) => {
        if (!vendor.inventoryValue) return false;
        
        if (item.category === 'retail') {
          return vendor.inventoryValue.quantity && vendor.inventoryValue.quantity > 0;
        } else {
          return vendor.inventoryValue.isAvailable === 'Y';
        }
      });

      return availableVendors;
    } catch (error) {
      console.error('Error checking item availability:', error);
      return [];
    }
  };

  const handleAddToCart = async (item: Item) => {
    const currentUserId = userId || await AsyncStorage.getItem('userId');
    if (!currentUserId || !isLoggedIn) {
      Alert.alert('Login Required', 'Please login to add items to cart');
      return;
    }

    try {
      const vendors = await checkItemAvailability(item);
      
      if (vendors.length === 0) {
        Alert.alert('Not Available', 'No vendors have this item available');
        return;
      }

      setSelectedItem(item);
      setAvailableVendors(vendors);
      setSelectedVendor(null);
      setShowVendorModal(true);
    } catch (error) {
      console.error('Error checking item availability:', error);
      Alert.alert('Error', 'Failed to check item availability');
    }
  };

  const handleVendorSelect = (vendor: Vendor) => {
    setSelectedVendor(vendor);
  };

  const handleVendorConfirm = async () => {
    if (!selectedVendor || !selectedItem) {
      Alert.alert('Error', 'Please select a vendor');
      return;
    }

    try {
      const token = await getToken();
      const currentUserId = userId || await AsyncStorage.getItem('userId');
      const response = await fetch(`${config.backendUrl}/cart/add/${currentUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemId: selectedItem._id,
          kind: selectedItem.category === 'retail' ? 'Retail' : 'Produce',
          quantity: 1,
          vendorId: selectedVendor._id
        })
      });

      if (response.ok) {
        // Refresh cart from server to ensure consistency
        await fetchCart();
        setShowVendorModal(false);
        setSelectedVendor(null);
        setSelectedItem(null);
        setAvailableVendors([]);
        Alert.alert('Success', `${selectedItem.name} added to cart!`);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const handleVendorCancel = () => {
    setShowVendorModal(false);
    setSelectedVendor(null);
    setSelectedItem(null);
    setAvailableVendors([]);
  };

  const removeFromCart = async (itemId: string) => {
    const currentUserId = userId || await AsyncStorage.getItem('userId');
    if (!currentUserId || !isLoggedIn) return;

    try {
      const token = await getToken();
      const response = await fetch(`${config.backendUrl}/cart/remove-one/${currentUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId })
      });

      if (response.ok) {
        // Refresh cart from server to ensure consistency
        await fetchCart();
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const decreaseQuantity = async (item: Item) => {
    const currentUserId = userId || await AsyncStorage.getItem('userId');
    if (!currentUserId || !isLoggedIn) return;

    try {
      const token = await getToken();
      const response = await fetch(`${config.backendUrl}/cart/remove-one/${currentUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          itemId: item._id, 
          kind: item.category === 'retail' ? 'Retail' : 'Produce' 
        })
      });

      if (response.ok) {
        // Refresh cart from server to ensure consistency
        await fetchCart();
      }
    } catch (error) {
      console.error('Error decreasing quantity:', error);
    }
  };

  const increaseQuantity = async (item: Item) => {
    const currentUserId = userId || await AsyncStorage.getItem('userId');
    if (!currentUserId || !isLoggedIn) return;

    try {
      const token = await getToken();
      const response = await fetch(`${config.backendUrl}/cart/add-one/${currentUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          itemId: item._id, 
          kind: item.category === 'retail' ? 'Retail' : 'Produce' 
        })
      });

      if (response.ok) {
        // Refresh cart from server to ensure consistency
        await fetchCart();
      }
    } catch (error) {
      console.error('Error increasing quantity:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (collegeId) {
        await fetchAllItems(collegeId);
        await fetchSpecialItems(collegeId, [], []); // Pass empty arrays since fetchSpecialItems now fetches its own data
        if (isLoggedIn) {
          await fetchUserData(); // This will also fetch favorites
        }
        await fetchCart();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('Current state:', {
      items: Object.keys(items).length,
      specialItems: specialItems.length,
      favoriteItems: favoriteItems.length,
      cart: Object.keys(cart).length,
      cartDetails: cart,
      isLoggedIn,
      userId,
      collegeId
    });
  }, [items, specialItems, favoriteItems, cart, isLoggedIn, userId, collegeId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4ea199" />
        <Text style={styles.loadingText}>Loading {collegeName}...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to {collegeName}</Text>
        <View style={styles.content}>
          <Text style={styles.subtitle}>Please sign up to continue</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push({
              pathname: '/signup/SignupForm',
              params: { college: collegeName },
            })}
          >
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{collegeName}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => router.push('/search/Search')}
          >
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cartButton}
            onPress={() => router.push('/cart')}
          >
            <Ionicons name="cart" size={24} color="#fff" />
            {Object.keys(cart).length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {Object.keys(cart).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/profile/ProfilePage')}
          >
            <Ionicons name="person-circle" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

            {/* Special Offers Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Offers</Text>
        {specialItems.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
          >
            {specialItems.map((item) => (
              <View key={item._id} style={styles.itemCard}>
                {item.image && (
                  <Image 
                    source={{ uri: item.image }} 
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                  <View style={styles.badgeRow}>
                  {item.packable && (
                    <View style={styles.packableBadge}>
                      <Text style={styles.packableText}>Packable</Text>
                    </View>
                    
                  )}
                  <View style={styles.specialBadge}>
                    <Text style={styles.specialText}>Special</Text>
                  </View>
                </View>
                </View>
                
                <View style={styles.itemActions}>
                  {cart[item._id] ? (
                    <View style={styles.quantityControls}>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => decreaseQuantity(item)}
                      >
                        <Ionicons name="remove" size={20} color="#4ea199" />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{cart[item._id]}</Text>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => increaseQuantity(item)}
                      >
                        <Ionicons name="add" size={20} color="#4ea199" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={() => handleAddToCart(item)}
                    >
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>No special offers available</Text>
        )}
      </View>

      {/* Favorite Items */}
      
  <ScrollView
  
  horizontal
  showsHorizontalScrollIndicator={false}
  style={styles.horizontalScroll}
>
  {favoriteItems.map((item) => (
    <View key={item._id} style={styles.itemCard}>
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={styles.itemImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>₹{item.price}</Text>

        <View style={styles.itemActions}>
          {cart[item._id] ? (
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => decreaseQuantity(item)}
              >
                <Ionicons name="remove" size={20} color="#4ea199" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{cart[item._id]}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => increaseQuantity(item)}
              >
                <Ionicons name="add" size={20} color="#4ea199" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddToCart(item)}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.favoriteBadge}>
        <Ionicons name="heart" size={16} color="#ff4757" />
      </View>
    </View>
  ))}
</ScrollView>


      {/* All Items by Category */}
      <ScrollView 
        style={styles.itemsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {Object.entries(items).map(([categoryKey, categoryItems]) => (
          <View key={categoryKey} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {categoryKey.split('-')[1].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </Text>
            {categoryItems.map((item) => (
              <View key={item._id} style={styles.itemCard}>
                {item.image && (
                  <Image 
                    source={{ uri: item.image }} 
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                  {item.packable && (
                    <View style={styles.packableBadge}>
                      <Text style={styles.packableText}>Packable</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.itemActions}>
                  {cart[item._id] ? (
                    <View style={styles.quantityControls}>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => decreaseQuantity(item)}
                      >
                        <Ionicons name="remove" size={20} color="#4ea199" />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{cart[item._id]}</Text>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => increaseQuantity(item)}
                      >
                        <Ionicons name="add" size={20} color="#4ea199" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={() => handleAddToCart(item)}
                    >
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
        
        {Object.keys(items).length === 0 && allItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Items</Text>
            {allItems.map((item) => (
              <View key={item._id} style={styles.itemCard}>
                {item.image && (
                  <Image 
                    source={{ uri: item.image }} 
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                  {item.packable && (
                    <View style={styles.packableBadge}>
                      <Text style={styles.packableText}>Packable</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.itemActions}>
                  {cart[item._id] ? (
                    <View style={styles.quantityControls}>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => decreaseQuantity(item)}
                      >
                        <Ionicons name="remove" size={20} color="#4ea199" />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{cart[item._id]}</Text>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => increaseQuantity(item)}
                      >
                        <Ionicons name="add" size={20} color="#4ea199" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={() => handleAddToCart(item)}
                    >
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
        
        {Object.keys(items).length === 0 && allItems.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No items available</Text>
          </View>
        )}
      </ScrollView>

      {/* Vendor Modal */}
      <VendorModal
        visible={showVendorModal}
        vendors={availableVendors}
        selectedVendor={selectedVendor}
        onVendorSelect={handleVendorSelect}
        onConfirm={handleVendorConfirm}
        onCancel={handleVendorCancel}
        itemName={selectedItem?.name || ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#4ea199',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#4ea199',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchButton: {
    padding: 8,
  },
  cartButton: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ff4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileButton: {
    padding: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedCategory: {
    backgroundColor: '#4ea199',
    borderColor: '#4ea199',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  itemsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  itemCard: {
    // flexDirection: 'row',
    // position:'relative',
    // justifyContent: 'space-between',
    // alignItems: 'center',
    // backgroundColor: '#fff',
    // padding: 16,
    // marginVertical: 6,
    // borderRadius: 16,
    // elevation: 3,
    // shadowColor: '#000',
    // shadowOffset: {
    //   width: 0,
    //   height: 4,
    // },
    // shadowOpacity: 0.12,
    // shadowRadius: 8,
    // borderWidth: 1,
    // borderColor: '#f1f5f9',
    width: 180,
  backgroundColor: '#fff',
  padding: 12,
  borderRadius: 16,
  marginRight: 12,
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  borderWidth: 1,
  borderColor: '#f1f5f9',
  position: 'relative',
  alignItems: 'center',
  },
  itemImage: {
    // width: 70,
    // height: 70,
    // borderRadius: 12,
    // marginRight: 16,
     width: 120,
  height: 80,
  borderRadius: 12,
  marginBottom: 8,
  },
  
itemContent: {
  // flex: 1,
  // paddingLeft: 4,
  // justifyContent: 'space-between',
   width: '100%',
  alignItems: 'center',
},
  itemInfo: {
    flex: 1,
  },
  itemName: {
    // fontSize: 16,
    // fontWeight: '600',
    // color: '#1e293b',
    // marginBottom: 4,
      fontSize: 14,
  fontWeight: '600',
  color: '#1e293b',
  textAlign: 'center',
  marginBottom: 4,
  },
  itemPrice: {
    // fontSize: 18,
    // fontWeight: '700',
    // color: '#4ea199',
    // marginBottom: 4,
    fontSize: 16,
  fontWeight: '700',
  color: '#4ea199',
  marginBottom: 8,
  },
  packableBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
   // marginBottom: 6,
   marginTop:7
  },
  packableText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    
  },
  itemActions: {
//alignItems: 'center',
  marginTop: 4,
  alignItems: 'center',
  },
  addButton: {
    
    backgroundColor: '#4ea199',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#4ea199',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginTop:30
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
   paddingHorizontal: 10,
  paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quantityButton: {
    // padding: 8,
    // borderRadius: 16,
    // backgroundColor: '#fff',
    // elevation: 1,
    // shadowColor: '#000',
    // shadowOffset: {
    //   width: 0,
    //   height: 1,
    // },
    // shadowOpacity: 0.1,
    // shadowRadius: 2,
      padding: 6,
  borderRadius: 16,
  backgroundColor: '#fff',
  elevation: 1,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  marginTop:5
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  horizontalScroll: {
    paddingBottom: 15,
    paddingLeft: 5,
  },
  badgeRow: {
  flexDirection: 'row',
  gap: 6,
  marginBottom: 6,
},

  specialBadge: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  specialText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  favoriteBadge: {
  // //   backgroundColor: '#fff',
  // //   paddingHorizontal: 12,
  // //   paddingVertical: 6,
  // //  // borderRadius: 16,
  // //   marginTop: 1,
  // //  // borderWidth: 2,
  // //   //borderColor: '#ff4757',
  // //  // elevation: 1,
  // //   // shadowColor: '#ff4757',
  // //   // shadowOffset: {
  // //   //   width: 0,
  // //   //   height: 1,
  // //   // },
  // //   // shadowOpacity: 0.2,
  // //   // shadowRadius: 2,
  // //   position:'absolute'
  //  position: 'absolute',
  // top: 8,
  // right: 8,
  // backgroundColor: '#fff',
  // borderRadius: 16,
  // padding: 6,
  // zIndex: 10,
  // // Optional shadow for elevation (iOS & Android)
  // shadowColor: '#000',
  // shadowOffset: { width: 0, height: 1 },
  // shadowOpacity: 0.1,
  // shadowRadius: 2,
  // elevation: 3,
   position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 6,
  zIndex: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 3,
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4ea199',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4ea199',
    fontWeight: '600',
  },
  
});  
