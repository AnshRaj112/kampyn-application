import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { ChevronRight, ChevronDown, Plus, Minus } from "lucide-react-native";
import axios from "axios";
import { useRouter, useLocalSearchParams } from "expo-router";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import 'react-toastify/dist/ReactToastify.css';
import { Ionicons } from "@expo/vector-icons";
import { getToken, removeToken } from "../../utils/storage";
import { config } from "../config";
import Icon from 'react-native-vector-icons/FontAwesome';
import { CustomToast } from '../CustomToast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';



// Interfaces
interface FoodItem {
  _id: string;
  name: string;
  type: string;
  uniId: string;
  unit?: string;
  price: number;
  image: string;
  isSpecial: string;
  kind: string;
  vendorId: string;
  vendorName?: string;
}

interface College {
  _id: string;
  fullName: string;
  shortName: string;
}

interface Vendor {
  _id: string;
  name: string;
  price: number;
  inventoryValue: {
    price: number;
    quantity: number;
    isAvailable?: string;
  };
}

interface User {
  _id: string;
  name: string;
}

interface CartItem {
  _id: string;
  quantity: number;
  kind: string;
  vendorId: string;
  vendorName: string;
}

interface CartResponseItem {
  itemId: string;
  quantity: number;
  kind: string;
  vendorId: string;
  vendorName: string;
}

const categories = {
  produce: ["combos-veg", "combos-nonveg", "veg", "shakes", "juices", "soups", "non-veg"],
  retail: ["biscuits", "chips", "icecream", "drinks", "snacks", "sweets", "nescafe"],
};

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={
        Platform.OS === 'web'
          ? {
              position: 'fixed',
              right: 20,
              bottom: 20,
              left: 'auto',
              width: 350,
              zIndex: 99999,
            }
          : {}
      }
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={
        Platform.OS === 'web'
          ? {
              position: 'fixed',
              right: 20,
              bottom: 20,
              left: 'auto',
              width: 350,
              zIndex: 99999,
            }
          : {}
      }
    />
  ),
};

const FavouriteFoodPageContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [colleges, setColleges] = useState<College[]>([]);
  const [favorites, setFavorites] = useState<FoodItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<{ [key: string]: string }>({});
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [currentVendorId, setCurrentVendorId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [addingToCart, setAddingToCart] = useState<Set<string>>(new Set());


  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:5001";

  const getAuthToken = async () => {
    try {
      return await getToken();
    } catch (error) {
      console.error("Error getting token from storage:", error);
      return null;
    }
  };

  const getAuthConfig = async () => {
    const token = await getAuthToken();
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // Fetch user
  const fetchUserDetails = async () => {
    try {
      setCheckingAuth(true);
      const token = await getAuthToken();
      if (!token) {
        setIsAuthenticated(false);
        router.push("/login/LoginForm");
        return;
      }
      const response = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error fetching user details:", error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        await removeToken();
        setIsAuthenticated(false);
        router.push("/login/LoginForm");
      }
    } finally {
      setCheckingAuth(false);
    }
  };

  // Fetch colleges
  const fetchColleges = async () => {
    if (!isAuthenticated) return;
    try {
      const configAuth = await getAuthConfig();
      const response = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/auth/list`, configAuth);
      setColleges(response.data);
    } catch (error) {
      console.error("Error fetching colleges:", error);
    }
  };

  // Fetch cart
  const fetchCartItems = async () => {
    if (!isAuthenticated || !user?._id) return;
    try {
      const configAuth = await getAuthConfig();
      const response = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/cart/${user._id}`, configAuth);
      const cartData = response.data.cart || [];
      const formattedCartItems = cartData.map((item: CartResponseItem) => ({
        _id: item.itemId,
        quantity: item.quantity,
        kind: item.kind,
        vendorId: item.vendorId || response.data.vendorId,
        vendorName: item.vendorName || response.data.vendorName,
      }));
      setCartItems(formattedCartItems);
      if (formattedCartItems.length > 0) {
        setCurrentVendorId(formattedCartItems[0].vendorId);
      } else {
        setCurrentVendorId(null);
      }
    } catch (error) {
      console.error("Error fetching cart items:", error);
    }
  };

  // Fetch vendors
  const fetchVendors = async () => {
    if (!isAuthenticated || colleges.length === 0) return;
    try {
      const configAuth = await getAuthConfig();
      if (selectedCollege) {
        const response = await axios.get(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/vendor/list/uni/${selectedCollege._id}`,
          configAuth
        );
        const vendorsMap = response.data.reduce((acc: { [key: string]: string }, vendor: Vendor) => {
          acc[vendor._id] = vendor.name;
          return acc;
        }, {});
        setVendors(vendorsMap);
      } else {
        const vendorPromises = colleges.map((college) =>
          axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/vendor/list/uni/${college._id}`, configAuth)
        );
        const responses = await Promise.all(vendorPromises);
        const allVendors = responses.flatMap((res) => res.data);
        const vendorsMap = allVendors.reduce((acc: { [key: string]: string }, vendor: Vendor) => {
          if (!acc[vendor._id]) acc[vendor._id] = vendor.name;
          return acc;
        }, {});
        setVendors(vendorsMap);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);

  useEffect(() => {
    fetchColleges();
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCartItems();
  }, [user?._id, isAuthenticated]);

  useEffect(() => {
    fetchVendors();
  }, [selectedCollege, colleges, isAuthenticated]);

  // Move fetchFavorites out of useEffect so it can be reused
  const fetchFavorites = async () => {
    if (!isAuthenticated || !user?._id || colleges.length === 0) return;
    try {
      setLoading(true);
      const configAuth = await getAuthConfig();
      const url = selectedCollege
        ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/fav/${user._id}/${selectedCollege._id}`
        : `${process.env.EXPO_PUBLIC_BACKEND_URL}/fav/${user._id}`;
      const response = await axios.get(url, configAuth);
      const sortedFavorites = selectedCollege
        ? response.data.favourites
        : response.data.favourites.sort((a: FoodItem, b: FoodItem) => {
            const collegeA = colleges.find(c => c._id === a.uniId)?.fullName || '';
            const collegeB = colleges.find(c => c._id === b.uniId)?.fullName || '';
            return collegeA.localeCompare(collegeB);
          });
      setFavorites(sortedFavorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // handleToggleFavorite function
  const handleToggleFavorite = async (food: FoodItem) => {
    const userId = user?._id;
    if (!userId) return;

    const kind = food.kind;
    const itemId = food._id;
    const vendorId = food.vendorId;
    const favKey = `${itemId}-${vendorId}`;
    const isAlreadyFav = favoriteIds.includes(favKey);

    try {
      // Optimistically update the UI
      setFavoriteIds((prev) =>
        isAlreadyFav ? prev.filter((id) => id !== favKey) : [...prev, favKey]
      );

      // Make PATCH request
      const res = await fetch(
        `${BACKEND_URL}/fav/${userId}/${itemId}/${kind}/${vendorId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to update favorite");
      }

      Toast.show({
        type: 'success',
        text1: isAlreadyFav ? 'Removed from favorites' : 'Added to favorites',
      });
    } catch (err) {
      console.error(err);

      Toast.show({
        type: 'error',
        text1: 'Something went wrong',
      });

      // Revert UI if error
      setFavoriteIds((prev) =>
        isAlreadyFav ? [...prev, favKey] : prev.filter((id) => id !== favKey)
      );
    }
  };

  const handleCollegeSelect = (college: College | null) => {
    setSelectedCollege(college);
    const updatedParams = { ...searchParams };
    if (college) {
      updatedParams.college = college._id;
    } else {
      delete updatedParams.college;
    }
    router.replace({
      pathname: '/fav/FavouritePage',
      params: updatedParams,
    });
    setIsDropdownOpen(false);
  };

  const checkVendorAvailability = async (vendorId: string, itemId: string, itemType: string) => {
    try {
      const isRetail = categories.retail.includes(itemType);
      const isProduce = categories.produce.includes(itemType);
      const token = await getAuthToken();
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/item/vendors/${itemId}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        return false;
      }
      const vendors = await response.json() as Vendor[];
      const vendor = vendors.find((v) => v._id === vendorId);
      if (!vendor || !vendor.inventoryValue) {
        return false;
      }
      if (isRetail) {
        const quantity = vendor.inventoryValue.quantity;
        return typeof quantity === 'number' && quantity > 0;
      } else if (isProduce) {
        return vendor.inventoryValue.isAvailable === 'Y';
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const getVendorName = (vendorId: string): string => {
    if (!vendorId || typeof vendorId !== 'string') {
      return "Unknown Vendor";
    }
    const vendorName = vendors[vendorId];
    if (!vendorName) {
      return "Unknown Vendor";
    }
    return vendorName;
  };

  const handleAddToCart = async (foodItem: FoodItem) => {
    if (!user?._id) {
      router.push("/login/LoginForm");
      return;
    }

    // Add loading state
    setAddingToCart(prev => new Set(prev).add(foodItem._id));

    try {
      if (currentVendorId && currentVendorId !== foodItem.vendorId) {
        Toast.show({
          type: "error",
          text1: "Vendor Conflict",
          text2: "Add items from the same vendor only. Please clear your cart first.",
        });
        return;
      }

      const isVendorAvailable = await checkVendorAvailability(
        foodItem.vendorId,
        foodItem._id,
        foodItem.type
      );

      if (!isVendorAvailable) {
        Toast.show({
          type: "error",
          text1: "Item Unavailable",
          text2: "This item is currently unavailable. Try again later.",
        });
        return;
      }

      const existingItem = cartItems.find(
        (item) =>
          item._id === foodItem._id && item.vendorId === foodItem.vendorId
      );

      if (existingItem) {
        await axios.post(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/cart/add-one/${user._id}`,
          {
            itemId: foodItem._id,
            kind: foodItem.kind,
            vendorId: foodItem.vendorId
          },
          await getAuthConfig()
        );
      } else {
        await axios.post(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/cart/add/${user._id}`,
          {
            itemId: foodItem._id,
            kind: foodItem.kind,
            quantity: 1,
            vendorId: foodItem.vendorId
          },
          await getAuthConfig()
        );
      }

      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/cart/${user._id}`,
        await getAuthConfig()
      );

      const cartData = response.data.cart || [];

      const formattedCartItems = cartData.map((item: CartResponseItem) => ({
        _id: item.itemId,
        quantity: item.quantity,
        kind: item.kind,
        vendorId: foodItem.vendorId,
        vendorName: foodItem.vendorName || getVendorName(foodItem.vendorId),
      }));

      setCartItems(formattedCartItems);

      if (!currentVendorId) {
        setCurrentVendorId(foodItem.vendorId);
      }

      Toast.show({
        type: "success",
        text1: "Added to Cart",
        text2: `${foodItem.name} has been added successfully.`,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const errorMsg = error.response.data.message;

        if (errorMsg.includes("max quantity")) {
          Toast.show({
            type: "info",
            text1: "Limit Reached",
            text2: `Maximum limit reached for ${foodItem.name}`,
          });
        } else if (errorMsg.includes("Only")) {
          const available = errorMsg.split("Only ")[1];
          Toast.show({
            type: "info",
            text1: "Limited Availability",
            text2: `Only ${available} available for ${foodItem.name}`,
          });
        } else {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: errorMsg,
          });
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Failed",
          text2: "Failed to add item to cart",
        });
      }
    } finally {
      // Remove loading state
      setAddingToCart(prev => {
        const newSet = new Set(prev);
        newSet.delete(foodItem._id);
        return newSet;
      });
    }
  };

  const handleIncreaseQuantity = async (foodItem: FoodItem) => {
    if (!user?._id) return;

    // Add loading state
    setLoadingItems(prev => new Set(prev).add(foodItem._id));

    try {
      const isVendorAvailable = await checkVendorAvailability(
        foodItem.vendorId,
        foodItem._id,
        foodItem.type
      );
      if (!isVendorAvailable) {
        Toast.show({
          type: "error",
          text1: "Item Unavailable",
          text2: "This item is currently unavailable. Try again later."
        });
        return;
      }

      const configAuth = await getAuthConfig();

      await axios.post(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/cart/add-one/${user._id}`,
        {
          itemId: foodItem._id,
          kind: foodItem.kind,
          vendorId: foodItem.vendorId
        },
        configAuth
      );

      const response = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/cart/${user._id}`, configAuth);
      const cartData = response.data.cart || [];

      const formattedCartItems = cartData.map((item: CartResponseItem) => ({
        _id: item.itemId,
        quantity: item.quantity,
        kind: item.kind,
        vendorId: foodItem.vendorId,
        vendorName: foodItem.vendorName || getVendorName(foodItem.vendorId)
      }));

      setCartItems(formattedCartItems);

      Toast.show({
        type: "success",
        text1: "Quantity Increased",
        text2: `Increased quantity of ${foodItem.name}`
      });

    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const errorMsg = error.response.data.message;

        if (errorMsg.includes("max quantity")) {
          Toast.show({
            type: "info",
            text1: "Limit Reached",
            text2: `Maximum limit reached for ${foodItem.name}`
          });
        } else if (errorMsg.includes("Only")) {
          const available = errorMsg.split("Only ")[1];
          Toast.show({
            type: "info",
            text1: "Limited Availability",
            text2: `Only ${available} available for ${foodItem.name}`
          });
        } else {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: errorMsg
          });
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Failed",
          text2: "Failed to increase quantity"
        });
      }
    } finally {
      // Remove loading state
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(foodItem._id);
        return newSet;
      });
    }
  };

  const handleDecreaseQuantity = async (foodItem: FoodItem) => {
    if (!user?._id) return;
    
    // Add loading state
    setLoadingItems(prev => new Set(prev).add(foodItem._id));
    
    const configAuth = await getAuthConfig();

    try {
      await axios.post(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/cart/remove-one/${user._id}`,
        {
          itemId: foodItem._id,
          kind: foodItem.kind,
          vendorId: foodItem.vendorId
        },
        configAuth
      );

      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/cart/${user._id}`,
        configAuth
      );

      const cartData = response.data.cart || [];

      const formattedCartItems = cartData.map((item: CartResponseItem & { vendorId: string }) => ({
        _id: item.itemId,
        quantity: item.quantity,
        kind: item.kind,
        vendorId: item.vendorId,
        vendorName: getVendorName(item.vendorId)
      }));

      setCartItems(formattedCartItems);

      if (formattedCartItems.length === 0) {
        setCurrentVendorId(null);
      }

      Toast.show({
        type: 'info',
        text1: `Decreased quantity of ${foodItem.name}`,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        Toast.show({
          type: 'error',
          text1: error.response.data.message,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: "Failed to decrease quantity",
        });
      }
    } finally {
      // Remove loading state
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(foodItem._id);
        return newSet;
      });
    }
  };

  const clearCart = async () => {
    if (!user?._id) {
      return;
    }

    try {
      await axios.post(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/cart/clear/${user._id}`,
        {},
        await getAuthConfig()
      );

      setCartItems([]);
      setCurrentVendorId(null);
      Toast.show({
        type: "success",
        text1: "Cart cleared successfully",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed",
        text2: "Failed to clear cart"
      });
    }
  };

  const isCartEmpty = () => {
    return cartItems.length === 0;
  };

  const handleBack = () => {
    router.back();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      // Refetch all APIs when the page is focused
      fetchUserDetails();
      fetchColleges();
      fetchFavorites();
      fetchCartItems();
      fetchVendors();
    }, [selectedCollege, user?._id, isAuthenticated, colleges.length])
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4ea199"]} />
        }
      >
        <Toast position="bottom" config={toastConfig} />
        <View style={styles.header}>
          {/* <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#4ea199" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity> */}
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#4ea199" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>

            <Text style={styles.headerTitle}>Your Favorites</Text>
          </View>
          <View style={{ width: 32 }} />
          {/* {!isCartEmpty() && (
          <TouchableOpacity onPress={clearCart} style={styles.clearCartButton}>
            <Text style={styles.clearCartButtonText}>Clear Cart</Text>
          </TouchableOpacity>
        )} */}
        </View>

        {checkingAuth ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : !isAuthenticated ? (
          <View style={styles.centered}>
            <Text>Please log in to view your favorites</Text>
          </View>
        ) : (
          <>
            {

              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {selectedCollege ? selectedCollege.fullName : "Select your college"}
                  </Text>
                  <ChevronDown
                    size={20}
                    style={{
                      transform: [{ rotate: isDropdownOpen ? "180deg" : "0deg" }],
                    }}
                  />
                </TouchableOpacity>

                {isDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    <Pressable
                      style={styles.dropdownItem}
                      onPress={() => handleCollegeSelect(null)}
                    >
                      <Text style={styles.dropdownItemText}>All Colleges</Text>
                      <ChevronRight size={16} />
                    </Pressable>

                    {colleges.map((college) => (
                      <Pressable
                        key={college._id}
                        style={styles.dropdownItem}
                        onPress={() => handleCollegeSelect(college)}
                      >
                        <Text style={styles.dropdownItemText}>{college.fullName}</Text>
                        <ChevronRight size={16} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            }





            <View style={styles.collegeHeader}>
              <Text style={styles.collegeName}>
                {selectedCollege ? selectedCollege.fullName : "All Colleges"}
              </Text>
              <Text style={styles.subTitle}>Your Favorites</Text>
            </View>

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#000" />
              </View>
            ) : favorites.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Oops! You have no favorites yet</Text>
                <Text style={styles.emptySubtitle}>
                  Start adding your favorite items to see them here!
                </Text>
                <TouchableOpacity
                  style={styles.homeButton}
                  onPress={() => router.push("/")}
                >
                  <Text style={styles.homeButtonText}>Go to Home</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.foodGrid}>
                {favorites.map((food, idx) => {
                  const matchingCartItem = cartItems.find(
                    (item) => item._id === food._id && item.vendorId === food.vendorId
                  );

                  const quantity = matchingCartItem?.quantity || 0;
                  const isSameVendor = !currentVendorId || currentVendorId === food.vendorId;
                  const isInCart = quantity > 0;

                  const favKey = `${food._id}-${food.vendorId}`;
                  const isFavorited = favoriteIds.includes(favKey);


                  return (
                    <View key={`${food._id}-${food.vendorId || ''}-${idx}`} style={styles.foodCard}>
                      <View style={styles.imageWrapper}>
                        <Image
                          source={{ uri: food.image }}
                          style={styles.foodImage}
                          resizeMode="cover"
                        />
                        {!selectedCollege && (
                          <View style={styles.collegeTag}>
                            <Text style={styles.collegeTagText}>
                              {colleges.find((c) => c._id === food.uniId)?.fullName}
                            </Text>
                          </View>
                        )}
                      

                        <TouchableOpacity onPress={() => handleToggleFavorite(food)} style={styles.favButton}>
                        
                          <Icon
                            name={isFavorited ? 'heart-o' : 'heart'}
                            size={24}
                            color="#4ea199"
                          />
                        </TouchableOpacity>
                      </View>


                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.vendorName}>
                        {food.vendorName || "Unknown Vendor"}
                      </Text>
                      <Text style={styles.foodPrice}>₹{food.price}</Text>
                      {isInCart && isSameVendor ? (
                        <View style={styles.quantityControls}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleDecreaseQuantity(food)}
                            disabled={loadingItems.has(food._id)}
                          >
                            {loadingItems.has(food._id) ? (
                              <ActivityIndicator size="small" color="#333" />
                            ) : (
                              <Minus size={16} />
                            )}
                          </TouchableOpacity>
                          <Text style={styles.quantity}>{quantity}</Text>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleIncreaseQuantity(food)}
                            disabled={loadingItems.has(food._id)}
                          >
                            {loadingItems.has(food._id) ? (
                              <ActivityIndicator size="small" color="#333" />
                            ) : (
                              <Plus size={16} />
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.addToCartButton,
                            !isSameVendor && styles.disabledButton
                          ]}
                          onPress={() => handleAddToCart(food)}
                          disabled={!isSameVendor || addingToCart.has(food._id)}
                        >
                          {addingToCart.has(food._id) ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={[
                              styles.addToCartText,
                              !isSameVendor && styles.disabledButtonText
                            ]}>
                              {!isSameVendor ? "Different Vendor" : "Add to Cart"}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
        {refreshing && (
          <ActivityIndicator size="large" color="#4ea199" style={{ marginTop: 32 }} />
        )}
      </ScrollView>
       <Toast
              config={{
                error: (props) => <CustomToast {...props} />,
              }}
            />
    </SafeAreaView>
  );



};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
   
    justifyContent: 'space-between',
    marginBottom: 24,
    marginRight: 10,
    alignItems: 'flex-start',
    // flexDirection: 'column',
    // alignItems: 'center',
    // marginBottom: 24,
    // marginTop: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 1,
    marginBottom: 10,
    // marginLeft: 3,

  },
  backText: {
    marginLeft: 3,
    fontSize: 16,
    color: '#4ea199',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    //margin: 0,
    textAlign: "left",
    color: "#4ea199",
    textShadowColor: "rgba(78, 161, 153, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    alignSelf: 'center',
    marginTop: 30,
    paddingLeft: 5

  },
  clearCartButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  clearCartButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  dropdownContainer: {

    zIndex: 10,

    maxWidth: 600, 
    width: '100%', 
    marginTop: 0,
    marginBottom: 48, 
    marginLeft: 'auto',
    marginRight: 'auto',
    position: 'relative',



  },
  dropdownButton: {
    width: '100%',
    backgroundColor: '#e5e7eb',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 9999,


  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    borderColor: '#d1d5db',
    borderWidth: 1,
    maxHeight: 250,
    zIndex: 1001,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#374151',
  },
  collegeHeader: {
    marginBottom: 16,

    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    marginRight: 20
  },
  collegeName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4ea199',

    textShadowColor: "rgba(78, 161, 153, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginVertical: 0,
    marginHorizontal: 0,

  },
  subTitle: {
    fontSize: 19.2,
    fontWeight: '600',
    color: '#4ea199',

    textShadowColor: "rgba(78, 161, 153, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    margin: 0,

  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  foodCard: {

    backgroundColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  imageWrapper: {
    position: 'relative',
  },
  foodImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 1,
  },
  collegeTag: {
    // backgroundColor: '#4ea199',
    // paddingVertical: 4,
    // paddingHorizontal: 8,
    // borderRadius: 6,
    // alignSelf: 'flex-start',
    // marginBottom: 8,
    // //marginTop:5

    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#4ea199',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    zIndex: 1,
  },
  collegeTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  foodName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    
  },
  vendorName: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  foodPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4ea199',
  },
  addToCartButton: {
    marginTop: 12,
    backgroundColor: '#4ea199',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quantityControls: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4ea199',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
    color: '#1f2937',
  },
  emptyState: {
    marginTop: 48,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  homeButton: {
    marginTop: 16,
    backgroundColor: '#4ea199',
    padding: 12,
    borderRadius: 8,
  },
  homeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 48,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledButtonText: {
    color: '#999',
  },
  favButton: {
    padding: 8,
    borderRadius: 20,
    fontSize: 24,



    alignSelf: 'flex-end'

  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 10
  },


});

export default FavouriteFoodPageContent;

