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
import { styles } from './[id]/styles/styles';

interface User {
  _id: string;
  name: string;
  email: string;
  cart?: {
    itemId: string;
    kind: string;
    quantity: number;
  }[];
  favourites?: {
    itemId: string;
    vendorId: string;
    kind: string;
  }[];
}

interface VendorItem {
  itemId: string;
  name: string;
  description?: string;
  type?: string;
  subtype?: string;
  price: number;
  image?: string;
  quantity?: number;
  isAvailable?: string;
  vendorId?: string;
  isVeg?: boolean;
  category?: "retail" | "produce";
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
  const [universityId, setUniversityId] = useState<string>("");
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sort order state
  const [typeOrder, setTypeOrder] = useState<{ category: string; type: string; sortIndex: number }[]>([]);
  const [subtypeOrder, setSubtypeOrder] = useState<{ category: string; type: string; subtype: string; sortIndex: number }[]>([]);
  
  // Filter states
  const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non-veg">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "retail" | "produce">("all");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    setSelectedSubtype(null);
  }, [selectedType]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch vendor data
      const vendorResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/item/getvendors/${id}`);
      const vendorData = await vendorResponse.json();
      
      if (vendorData.success) {
        // Add category information to items (preserve original type field)
        let retailItems = vendorData.data.retailItems.map((item: VendorItem) => ({
          ...item,
          category: "retail" as const
        }));
        let produceItems = vendorData.data.produceItems.map((item: VendorItem) => ({
          ...item,
          category: "produce" as const
        }));
        
        // Fetch sort order (vendor-specific first, then university-wide)
        if (vendorData.uniID) {
          setUniversityId(vendorData.uniID);
          
          try {
            // Try vendor-specific sort order first
            let sortRes = await fetch(
              `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/menu-sort/order?uniId=${vendorData.uniID}&vendorId=${id}`
            );
            let sortData = null;
            
            if (sortRes.ok) {
              sortData = await sortRes.json();
            }
            
            // If vendor-specific doesn't exist or failed, try university-wide
            if (!sortData || !sortData.success) {
              sortRes = await fetch(
                `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/menu-sort/order?uniId=${vendorData.uniID}&vendorId=null`
              );
              if (sortRes.ok) {
                sortData = await sortRes.json();
              }
            }
            
            if (sortData && sortData.success && sortData.data) {
              // Store type and subtype order for later use
              if (sortData.data.typeOrder) {
                setTypeOrder(sortData.data.typeOrder);
              }
              if (sortData.data.subtypeOrder) {
                setSubtypeOrder(sortData.data.subtypeOrder);
              }
              
              // Apply item sort order
              if (sortData.data.itemOrder) {
                const sortMap = new Map<string, number>();
                sortData.data.itemOrder.forEach((item: { itemId: string; sortIndex: number }) => {
                  sortMap.set(item.itemId, item.sortIndex);
                });
                
                // Apply sort order to retail items
                if (sortMap.size > 0) {
                  retailItems = retailItems.sort((a: VendorItem, b: VendorItem) => {
                    const aIndex = sortMap.get(a.itemId);
                    const bIndex = sortMap.get(b.itemId);
                    if (aIndex !== undefined && bIndex !== undefined) {
                      return aIndex - bIndex;
                    }
                    if (aIndex !== undefined) return -1;
                    if (bIndex !== undefined) return 1;
                    return a.name.localeCompare(b.name);
                  });
                  
                  // Apply sort order to produce items
                  produceItems = produceItems.sort((a: VendorItem, b: VendorItem) => {
                    const aIndex = sortMap.get(a.itemId);
                    const bIndex = sortMap.get(b.itemId);
                    if (aIndex !== undefined && bIndex !== undefined) {
                      return aIndex - bIndex;
                    }
                    if (aIndex !== undefined) return -1;
                    if (bIndex !== undefined) return 1;
                    return a.name.localeCompare(b.name);
                  });
                }
              } else {
                // If no item order, sort alphabetically
                retailItems.sort((a: VendorItem, b: VendorItem) => a.name.localeCompare(b.name));
                produceItems.sort((a: VendorItem, b: VendorItem) => a.name.localeCompare(b.name));
              }
            } else {
              // If no sort order at all, sort alphabetically
              retailItems.sort((a: VendorItem, b: VendorItem) => a.name.localeCompare(b.name));
              produceItems.sort((a: VendorItem, b: VendorItem) => a.name.localeCompare(b.name));
            }
          } catch (err) {
            console.error("Error fetching sort order:", err);
            // Continue without sort order if it fails
            retailItems.sort((a: VendorItem, b: VendorItem) => a.name.localeCompare(b.name));
            produceItems.sort((a: VendorItem, b: VendorItem) => a.name.localeCompare(b.name));
          }
        }
        
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

  // Get all items
  const allItems = [
    ...(vendorData?.data.retailItems || []),
    ...(vendorData?.data.produceItems || [])
  ];

  // Create type order map (needed for sorting) - only include types that exist in vendor items
  const typeOrderMap = new Map<string, number>();
  const vendorTypeSet = new Set<string>();
  
  // First, collect all types that actually exist in the vendor's items
  allItems.forEach(item => {
    if (item.type) {
      vendorTypeSet.add(`${item.category || "retail"}-${item.type}`);
    }
  });
  
  // Only add types to the map if they exist in the vendor's items
  typeOrder.forEach((item) => {
    const key = `${item.category}-${item.type}`;
    if (vendorTypeSet.has(key)) {
      typeOrderMap.set(key, item.sortIndex);
    }
  });

  // Create subtype order map (needed for sorting) - only include subtypes that exist in vendor items
  const subtypeOrderMap = new Map<string, number>();
  const vendorSubtypeSet = new Set<string>();
  
  // First, collect all subtypes that actually exist in the vendor's items
  allItems.forEach(item => {
    if (item.type && item.subtype) {
      vendorSubtypeSet.add(`${item.category || "retail"}-${item.type}-${item.subtype}`);
    }
  });
  
  // Only add subtypes to the map if they exist in the vendor's items
  subtypeOrder.forEach((item) => {
    const key = `${item.category}-${item.type}-${item.subtype}`;
    if (vendorSubtypeSet.has(key)) {
      subtypeOrderMap.set(key, item.sortIndex);
    }
  });

  // Get unique types and subtypes for filters, sorted by type order
  // Only show types that actually exist in the vendor's items
  const uniqueTypes = Array.from(
    new Set(
      allItems
        .map(item => item.type)
        .filter((type): type is string => Boolean(type))
    )
  ).sort((a, b) => {
    // Try to get category for each type
    const typeAItems = allItems.filter(item => item.type === a);
    const typeBItems = allItems.filter(item => item.type === b);
    const categoryA = typeAItems[0]?.category || "retail";
    const categoryB = typeBItems[0]?.category || "retail";
    
    // Get sort indices (only if type exists in vendor items)
    const aKey = `${categoryA}-${a}`;
    const bKey = `${categoryB}-${b}`;
    const aIndex = typeOrderMap.get(aKey);
    const bIndex = typeOrderMap.get(bKey);
    
    if (aIndex !== undefined && bIndex !== undefined) {
      return aIndex - bIndex;
    }
    if (aIndex !== undefined) return -1;
    if (bIndex !== undefined) return 1;
    return a.localeCompare(b);
  });

  // Get unique subtypes for the selected type, sorted by subtype order
  // Only show subtypes that actually exist in the vendor's items for that type
  const uniqueSubtypes = selectedType
    ? Array.from(
        new Set(
          allItems
            .filter(item => item.type === selectedType && item.subtype)
            .map(item => item.subtype)
            .filter((subtype): subtype is string => Boolean(subtype))
        )
      ).sort((a, b) => {
        // Try to get category for the selected type
        const typeItems = allItems.filter(item => item.type === selectedType);
        const category = typeItems[0]?.category || "retail";
        
        // Get sort indices (only if subtype exists in vendor items)
        const aKey = `${category}-${selectedType}-${a}`;
        const bKey = `${category}-${selectedType}-${b}`;
        const aIndex = subtypeOrderMap.get(aKey);
        const bIndex = subtypeOrderMap.get(bKey);
        
        if (aIndex !== undefined && bIndex !== undefined) {
          return aIndex - bIndex;
        }
        if (aIndex !== undefined) return -1;
        if (bIndex !== undefined) return 1;
        return a.localeCompare(b);
      })
    : [];

  // Comprehensive filtering logic
  const filteredItems = allItems.filter(item => {
    // Veg/Non-veg filter
    const matchesVeg = vegFilter === "all" || 
      (vegFilter === "veg" && item.isVeg !== false) ||
      (vegFilter === "non-veg" && item.isVeg === false);
    
    // Category filter (retail/produce)
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    
    // Type filter
    const matchesType = !selectedType || item.type === selectedType;
    
    // Subtype filter (only applies when a type is selected)
    const matchesSubtype = !selectedType || !selectedSubtype || item.subtype === selectedSubtype;
    
    // Search query filter
    const matchesSearch = !searchQuery.trim() || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesVeg && matchesCategory && matchesType && matchesSubtype && matchesSearch;
  });

  // Group items by type and subtype for organized display
  const groupedItems = filteredItems.reduce((acc, item) => {
    const type = item.type || "Uncategorized";
    const subtype = item.subtype || "Other";
    
    if (!acc[type]) {
      acc[type] = {};
    }
    if (!acc[type][subtype]) {
      acc[type][subtype] = [];
    }
    acc[type][subtype].push(item);
    
    return acc;
  }, {} as Record<string, Record<string, VendorItem[]>>);

  // Sort types and subtypes
  const sortedTypes = Object.keys(groupedItems)
    .filter(type => {
      // Only include types that have at least one item
      const typeItems = Object.values(groupedItems[type]).flat();
      return typeItems.length > 0;
    })
    .sort((a, b) => {
      // Get category for type
      const typeAItems = Object.values(groupedItems[a]).flat();
      const typeBItems = Object.values(groupedItems[b]).flat();
      const categoryA = typeAItems[0]?.category || "retail";
      const categoryB = typeBItems[0]?.category || "retail";
      
      // Try to get sort index for both types
      const aKey = `${categoryA}-${a}`;
      const bKey = `${categoryB}-${b}`;
      const aIndex = typeOrderMap.get(aKey);
      const bIndex = typeOrderMap.get(bKey);
      
      if (aIndex !== undefined && bIndex !== undefined) {
        return aIndex - bIndex;
      }
      if (aIndex !== undefined) return -1;
      if (bIndex !== undefined) return 1;
      return a.localeCompare(b);
    });

  // Sort subtypes within each type
  sortedTypes.forEach(type => {
    const subtypes = groupedItems[type];
    const typeItems = Object.values(subtypes).flat();
    const category = typeItems[0]?.category || "retail";
    
    // Filter subtypes to only include those that have items, then sort
    const sortedSubtypes = Object.keys(subtypes)
      .filter(subtype => {
        return subtypes[subtype] && subtypes[subtype].length > 0;
      })
      .sort((a, b) => {
        // Put "Other" at the end
        if (a === "Other") return 1;
        if (b === "Other") return -1;
        
        // Only use sort order if subtype exists in vendor items
        const aKey = `${category}-${type}-${a}`;
        const bKey = `${category}-${type}-${b}`;
        const aIndex = subtypeOrderMap.get(aKey);
        const bIndex = subtypeOrderMap.get(bKey);
        
        if (aIndex !== undefined && bIndex !== undefined) {
          return aIndex - bIndex;
        }
        if (aIndex !== undefined) return -1;
        if (bIndex !== undefined) return 1;
        return a.localeCompare(b);
      });
    
    // Rebuild subtypes object in sorted order
    const sortedSubtypeObj: Record<string, VendorItem[]> = {};
    sortedSubtypes.forEach(subtype => {
      sortedSubtypeObj[subtype] = subtypes[subtype];
    });
    groupedItems[type] = sortedSubtypeObj;
  });

  const getItemQuantity = (itemId: string, category?: string) => {
    if (!userData?.cart) return 0;
    const kind = category === "retail" ? "Retail" : "Produce";
    const cartItem = userData.cart.find(
      item => item.itemId === itemId && item.kind === kind
    );
    return cartItem?.quantity || 0;
  };

  // Get the current vendor's ObjectId from the first item (retail or produce)
  const currentVendorId = vendorData?.data?.retailItems?.[0]?.vendorId || vendorData?.data?.produceItems?.[0]?.vendorId || id;

  const isItemFavourited = (item: VendorItem) => {
    if (!userData?.favourites) return false;
    return userData.favourites.some(
      (fav) =>
        String(fav.itemId) === String(item.itemId) &&
        String(fav.vendorId) === String(currentVendorId) &&
        fav.kind === (item.category === "retail" ? "Retail" : "Produce")
    );
  };

  const toggleFavourite = async (item: VendorItem) => {
    if (!userData) {
      Alert.alert('Error', 'Please login to favourite items');
      return;
    }

    const kind = item.category === "retail" ? "Retail" : "Produce";
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
          kind: item.category === "retail" ? "Retail" : "Produce"
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
          kind: item.category === "retail" ? "Retail" : "Produce"
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
          kind: item.category === "retail" ? "Retail" : "Produce"
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

  const renderItem = (item: VendorItem) => {
    const quantity = getItemQuantity(item.itemId, item.category);
    const isFav = isItemFavourited(item);

    return (
      <View style={styles.itemCard} key={item.itemId}>
        <Image
          source={{ uri: item.image || 'https://via.placeholder.com/120' }}
          style={styles.itemImage}
          resizeMode="cover"
        />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          
          <Text style={styles.itemPrice}>₹{item.price}</Text>
          
          {/* Veg/Non-veg indicator */}
          <Text style={[
            styles.itemVeg,
            { color: (item.isVeg !== false) ? '#22c55e' : '#ef4444' }
          ]}>
            {(item.isVeg !== false) ? '🟢 Veg' : '🔴 Non-Veg'}
          </Text>
          
          {/* Description */}
          {item.description && (
            <Text style={styles.itemDescription} numberOfLines={3}>
              {item.description}
            </Text>
          )}
          
          <View style={styles.belowdish}>
            <View>
              {item.quantity !== undefined && (
                <Text style={styles.quantity}>Available: {item.quantity}</Text>
              )}
            </View>
            {userData && (
              <TouchableOpacity
                style={styles.favouriteButton}
                onPress={() => toggleFavourite(item)}
              >
                <Ionicons 
                  name={isFav ? "heart" : "heart-outline"} 
                  size={24} 
                  color="#4ea199" 
                />
              </TouchableOpacity>
            )}
          </View>
          
          {userData && (
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
                    onPress={() => handleAddToCart(item)}
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
          )}
        </View>
      </View>
    );
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#4ea199" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{vendorData?.foodCourtName || 'Vendor Menu'}</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push('/cart')}
        >
          <Ionicons name="cart-outline" size={24} color="#4ea199" />
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
          placeholder="Search food items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
      </View>

      <ScrollView 
        style={styles.filtersContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* Veg/Non-veg Filter */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Diet:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtonsScroll}>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.filterButton, vegFilter === "all" && styles.activeFilterButton]}
                onPress={() => setVegFilter("all")}
              >
                <Text style={[styles.filterButtonText, vegFilter === "all" && styles.activeFilterButtonText]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, vegFilter === "veg" && styles.activeFilterButton]}
                onPress={() => setVegFilter("veg")}
              >
                <Text style={[styles.filterButtonText, vegFilter === "veg" && styles.activeFilterButtonText]}>
                  🟢 Veg
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, vegFilter === "non-veg" && styles.activeFilterButton]}
                onPress={() => setVegFilter("non-veg")}
              >
                <Text style={[styles.filterButtonText, vegFilter === "non-veg" && styles.activeFilterButtonText]}>
                  🔴 Non-Veg
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Category Filter (Retail/Produce) */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Category:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtonsScroll}>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.filterButton, categoryFilter === "all" && styles.activeFilterButton]}
                onPress={() => setCategoryFilter("all")}
              >
                <Text style={[styles.filterButtonText, categoryFilter === "all" && styles.activeFilterButtonText]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, categoryFilter === "retail" && styles.activeFilterButton]}
                onPress={() => setCategoryFilter("retail")}
              >
                <Text style={[styles.filterButtonText, categoryFilter === "retail" && styles.activeFilterButtonText]}>
                  Retail
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, categoryFilter === "produce" && styles.activeFilterButton]}
                onPress={() => setCategoryFilter("produce")}
              >
                <Text style={[styles.filterButtonText, categoryFilter === "produce" && styles.activeFilterButtonText]}>
                  Produce
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Type Filter */}
        {uniqueTypes.length > 0 && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Type:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtonsScroll}>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[styles.filterButton, !selectedType && styles.activeFilterButton]}
                  onPress={() => {
                    setSelectedType(null);
                    setSelectedSubtype(null);
                  }}
                >
                  <Text style={[styles.filterButtonText, !selectedType && styles.activeFilterButtonText]}>
                    All
                  </Text>
                </TouchableOpacity>
                {uniqueTypes.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterButton, selectedType === type && styles.activeFilterButton]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text style={[styles.filterButtonText, selectedType === type && styles.activeFilterButtonText]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Subtype Filter (only shown when a type is selected) */}
        {selectedType && uniqueSubtypes.length > 0 && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Subtype:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtonsScroll}>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[styles.filterButton, !selectedSubtype && styles.activeFilterButton]}
                  onPress={() => setSelectedSubtype(null)}
                >
                  <Text style={[styles.filterButtonText, !selectedSubtype && styles.activeFilterButtonText]}>
                    All
                  </Text>
                </TouchableOpacity>
                {uniqueSubtypes.map(subtype => (
                  <TouchableOpacity
                    key={subtype}
                    style={[styles.filterButton, selectedSubtype === subtype && styles.activeFilterButton]}
                    onPress={() => setSelectedSubtype(subtype)}
                  >
                    <Text style={[styles.filterButtonText, selectedSubtype === subtype && styles.activeFilterButtonText]}>
                      {subtype.charAt(0).toUpperCase() + subtype.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <ScrollView 
        style={styles.itemsList}
        contentContainerStyle={styles.itemsContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No items found matching your search' : 'No items available'}
            </Text>
          </View>
        ) : (
          sortedTypes.map(type => {
            const subtypes = groupedItems[type];
            return (
              <View key={type} style={styles.typeSection}>
                <Text style={styles.typeHeader}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                {Object.entries(subtypes).map(([subtype, items]) => (
                  <View key={`${type}-${subtype}`} style={styles.subtypeSection}>
                    {subtype !== "Other" && (
                      <Text style={styles.subtypeHeader}>{subtype.charAt(0).toUpperCase() + subtype.slice(1)}</Text>
                    )}
                    <View style={styles.itemsGrid}>
                      {items.map(item => renderItem(item))}
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default VendorPage; 