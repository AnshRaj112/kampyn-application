import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Text,useWindowDimensions, Button, RefreshControl, ActivityIndicator } from "react-native";
import axios from "axios";
import CartItemCard from "../components/CartItemCard"; 
import ExtrasCard from "../components/ExtrasCard"; 
import BillBox from "../components/BillBox";
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { FoodItem, CartItem } from "@/types/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken, removeToken } from "../../utils/storage";
import { TouchableOpacity } from 'react-native';
import { useRouter } from "expo-router";
import {  Platform } from 'react-native';
import { config } from "../../config";





// IMPORTANT: Replace '192.168.1.42' with your computer's local IP address for mobile access
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.1.42:5001";
const { width } = useWindowDimensions();
const isMobile = width < 1100;


interface ExtraItem {
  itemId: string;
  name: string;
  price: number;
  image: string;
  kind: string;
}

interface CartResponse {
  cart: Array<{
    itemId: string;
    name: string;
    image: string;
    unit: string;
    price: number;
    quantity: number;
    kind: string;
    packable?: boolean;
    totalPrice: number;
  }>;
  vendorName: string;
  vendorId: string;
}

interface ExtrasResponse {
  message: string;
  extras: ExtraItem[];
}

interface GuestCartItem extends Omit<CartItem, 'category'> {
  kind: string;
}
//  const getAuthToken = async () => {
//     try {
//       return await getToken();
//     } catch (error) {
//       console.error("Error getting token from storage:", error);
//       return null;
//     }
//   };

export const getAuthHeaders = async () => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      console.warn("[CartScreen] getAuthHeaders: no token in AsyncStorage");
      return { headers: {}, withCredentials: true };
    }

    return {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    };
  } catch (error) {
    console.error("[CartScreen] Error fetching token from AsyncStorage", error);
    return { headers: {}, withCredentials: true };
  }
};

export const getVendorName = (vendorName: string | undefined) => {
  if (!vendorName) {
    console.log("No vendorName provided");
    return "Unknown Vendor";
  }
  return vendorName;
};

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ zIndex: 2147483647 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: '400' }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ zIndex: 2147483647 }}
      text1Style={{ fontSize: 15 }}
      text2Style={{ fontSize: 13 }}
    />
  ),
};

export default function CartScreen() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [extras, setExtras] = useState<FoodItem[]>([]);
  const [userLoggedIn, setUserLoggedIn] = useState<boolean>(false);
  const [userData, setUserData] = useState<{ _id: string; foodcourtId: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [addingToCart, setAddingToCart] = useState<Set<string>>(new Set());
    //const [filteredExtras, setFilteredExtras] = useState<FoodItem[]>([]);

 // const navigation = useNavigation();
   const router = useRouter();

  // Move fetchExtras here so it can be used by fetchUserAndCart
  const fetchExtras = async (userId?: string) => {
    if (!userId && !userData?._id) return;
    const id = userId || userData?._id;
    try {
      const response = await axios.get<ExtrasResponse>(
        `${config.backendUrl}/cart/extras/${id}`,
        await getAuthHeaders()
      );
      const formatted: FoodItem[] = response.data.extras.map((e: ExtraItem) => ({
        _id: e.itemId,
        name: e.name,
        image: e.image,
        price: e.price,
        kind: e.kind,
      }));
      setExtras(formatted);
    } catch (err) {
      console.error("Error loading extras:", err);
      setExtras([]);
    }
  };

  // Move fetchUserAndCart here so it can access all state setters
  const fetchUserAndCart = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      console.log("[Cart] Token on mobile:", token);

      if (!token) {
        setUserLoggedIn(false);
        const rawGuest = await AsyncStorage.getItem("guest_cart") || "[]";
        console.log("[Cart] Guest cart from AsyncStorage:", rawGuest);
        const guestCart = JSON.parse(rawGuest);
        setCart(guestCart);
        return;
      }

      const res = await fetch(`${config.backendUrl}/api/user/auth/user`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        await AsyncStorage.removeItem("token");
        setUserLoggedIn(false);
        const rawGuest = await AsyncStorage.getItem("guest_cart") || "[]";
        console.log("[Cart] Guest cart from AsyncStorage (after token fail):", rawGuest);
        setCart(JSON.parse(rawGuest));
        return;
      }

      const user = await res.json();
      setUserLoggedIn(true);
      setUserData(user);

      const cartRes = await axios.get<CartResponse>(
        `${config.backendUrl}/cart/${user._id}`,
        await getAuthHeaders()
      );

      const rawCart = cartRes.data.cart || [];
      console.log("[Cart] Raw cart from backend:", rawCart);
      const detailedCart: CartItem[] = rawCart.map((c) => ({
        _id: c.itemId,
        userId: user._id,
        foodcourtId: user.foodcourtId,
        itemId: {
          _id: c.itemId,
          name: c.name,
          price: c.price,
          image: c.image,
          kind: c.kind,
        },
        quantity: c.quantity,
        kind: c.kind,
        name: c.name,
        price: c.price,
        image: c.image,
        vendorName: cartRes.data.vendorName,
        vendorId: cartRes.data.vendorId,
        category: (c.kind === "Retail" ? "Retail" : "Produce") as "Retail" | "Produce",
        packable: c.packable,
      }));

      setCart(detailedCart);
      await fetchExtras(user._id);
    } catch (error) {
      console.error("[Cart] Error in fetchUserAndCart():", error);
      await AsyncStorage.removeItem("token");
      setUserLoggedIn(false);
    }
  };

  useEffect(() => {
    fetchUserAndCart();
  }, []);

  // Refresh cart every time the screen is focused (mobile only)
  useFocusEffect(
    React.useCallback(() => {
      fetchUserAndCart();
    }, [])
  );

 // Add a new useEffect to refetch extras when cart changes
 useEffect(() => {
    if (userData?._id && cart.length > 0) {
      const fetchExtras = async () => {
        try {
          console.log(
            '[Cart.tsx] ▶︎ Refetching extras for user:',
            userData._id
          );
          const response = await axios.get<ExtrasResponse>(
            `${config.backendUrl}/cart/extras/${userData._id}`,
           await getAuthHeaders()
          );

          if (response.data.extras) {
            const formatted: FoodItem[] = response.data.extras.map(
              (e: ExtraItem) => ({
                _id: e.itemId,
                name: e.name,
                image: e.image,
                price: e.price,
                kind: e.kind,
              })
            );
            setExtras(formatted);
          } else {
            setExtras([]);
          }
        } catch (err) {
          console.error('[Cart.tsx] ❌ Error refetching extras:', err);
          setExtras([]);
        }
      };

      fetchExtras();
    } else {
      setExtras([]);
    }
  }, [cart, userData?._id]);


    const reFetchCart = async () => {
    try {
      if (!userData) return;

      console.log(
        '[Cart.tsx] ▶︎ reFetchCart → GET',
        `${config.backendUrl}/cart/${userData._id}`
      );

      const cartRes = await axios.get<CartResponse>(
        `${config.backendUrl}/cart/${userData._id}`,
        await getAuthHeaders()
      );

      console.log('[Cart.tsx] ← reFetchCart →', cartRes.data);
      const raw = cartRes.data.cart || [];

      const updated: CartItem[] = raw.map((c) => {
        const category = c.kind === 'Retail' ? 'Retail' : 'Produce';

        return {
          _id: c.itemId,
          userId: userData._id,
          foodcourtId: userData.foodcourtId,
          itemId: {
            _id: c.itemId,
            name: c.name,
            price: c.price,
            image: c.image,
            kind: c.kind,
          },
          quantity: c.quantity,
          kind: c.kind,
          name: c.name,
          price: c.price,
          image: c.image,
          vendorName: cartRes.data.vendorName,
          vendorId: cartRes.data.vendorId,
          category,
          packable: c.packable,
        };
      });

      setCart(updated);
    } catch (err: unknown) {
      console.error('[Cart.tsx] ❌ reFetchCart error:', err);
    }
  };

  
const increaseQty = async (id: string) => {
  const thisItem = cart.find((i) => i._id === id);
  if (!thisItem) {
    console.warn(`[Cart.tsx] increaseQty: item ${id} not found in state.cart`);
    return;
  }

  // Add loading state
  setLoadingItems(prev => new Set(prev).add(id));

  if (userLoggedIn && userData) {
    console.log(
      `[Cart.tsx] ▶︎ POST /cart/add-one/${userData._id} { itemId: ${id}, kind: ${thisItem.kind} }`
    );

    try {
      const authConfig = await getAuthHeaders();

      await axios.post(
        `${config.backendUrl}/cart/add-one/${userData._id}`,
        { itemId: id, kind: thisItem.kind },
        authConfig
      );

      console.log("[Cart.tsx] ← /cart/add-one succeeded, re-fetching cart");
      Toast.show({
        type: 'success',
        text1: 'Quantity Updated',
        text2: `Increased quantity of ${thisItem.name}`,
      });
      reFetchCart();
    } catch (err: any) {
      console.error("[Cart.tsx] ❌ /cart/add-one error:", err);
      const errorMsg = err.response?.data?.message || '';

      if (errorMsg.includes('max quantity')) {
        Toast.show({
          type: 'error',
          text1: 'Limit Reached',
          text2: `Maximum limit reached for ${thisItem.name}`,
        });
      } else if (errorMsg.includes('Only')) {
        Toast.show({
          type: 'error',
          text1: 'Stock Limited',
          text2: `Only ${errorMsg.split('Only ')[1]} available for ${thisItem.name}`,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: `Failed to increase quantity`,
        });
      }
    } finally {
      // Remove loading state
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  } else {
    
    const updatedCart = cart.map((item) =>
      item._id === id ? { ...item, quantity: item.quantity + 1 } : item
    ) as CartItem[];
    console.log("[Cart.tsx] (guest) increaseQty → new cart:", updatedCart);
    setCart(updatedCart);
    localStorage.setItem('guest_cart', JSON.stringify(updatedCart));
    Toast.show({
      type: 'success',
      text1: 'Quantity Updated',
      text2: `Increased quantity of ${thisItem.name}`,
    });
    
    // Remove loading state for guest
    setLoadingItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }
};


const decreaseQty = async (id: string) => {
  const thisItem = cart.find((i) => i._id === id);
  if (!thisItem) {
    console.warn(`[CartScreen] decreaseQty: item ${id} not found in cart`);
    return;
  }

  if (thisItem.quantity <= 1) {
    console.log(`[CartScreen] decreaseQty blocked: quantity is already 1`);
    return;
  }

  // Add loading state
  setLoadingItems(prev => new Set(prev).add(id));

  if (userLoggedIn && userData) {
    console.log(
      `[CartScreen] ▶︎ POST /cart/remove-one/${userData._id} { itemId: ${id}, kind: ${thisItem.kind} }`
    );

    try {
      const headers = await getAuthHeaders(); // Ensure getAuthHeaders() is async if using AsyncStorage

      await axios.post(
        `${config.backendUrl}/cart/remove-one/${userData._id}`,
        { itemId: id, kind: thisItem.kind },
        headers
      );

      console.log(`[CartScreen] ← /cart/remove-one succeeded, re-fetching cart`);
      Toast.show({
        type: 'info',
        text1: 'Quantity Updated',
        text2: `Decreased quantity of ${thisItem.name}`,
      });
      reFetchCart();
    } catch (err: any) {
      console.error(`[CartScreen] ❌ /cart/remove-one error:`, err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.response?.data?.message || 'Failed to decrease quantity',
      });
    } finally {
      // Remove loading state
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  } else {

    const updatedCart = cart.map((item) =>
      item._id === id ? { ...item, quantity: item.quantity - 1 } : item
    ) as CartItem[];

    console.log("[CartScreen] (guest) decreaseQty → new cart:", updatedCart);
    setCart(updatedCart);
    localStorage.setItem("guest_cart", JSON.stringify(updatedCart));
    Toast.show({
      type: 'info',
      text1: 'Quantity Updated',
      text2: `Decreased quantity of ${thisItem.name}`,
    });
    
    // Remove loading state for guest
    setLoadingItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }
};



const removeItem = async (id: string) => {
  const thisItem = cart.find((i) => i._id === id);
  if (!thisItem) {
    console.warn(`[CartScreen] removeItem: item ${id} not found in cart`);
    return;
  }

  if (userLoggedIn && userData) {
    console.log(
      `[CartScreen] ▶︎ POST /cart/remove-item/${userData._id} { itemId: ${id}, kind: ${thisItem.kind} }`
    );

    try {
      const headers = await getAuthHeaders();

      await axios.post(
        `${config.backendUrl}/cart/remove-item/${userData._id}`,
        { itemId: id, kind: thisItem.kind },
        headers
      );

      console.log(`[CartScreen] ← /cart/remove-item succeeded, re-fetching cart`);
      Toast.show({
        type: 'error',
        text1: 'Item Removed',
        text2: `${thisItem.name} removed from cart`,
      });
      reFetchCart();
    } catch (err: any) {
      console.error(`[CartScreen] ❌ /cart/remove-item error:`, err);
      Toast.show({
        type: 'error',
        text1: 'Remove Failed',
        text2: err.response?.data?.message || 'Failed to remove item',
      });
    }
  } else {
    
    const updatedCart = cart.filter((item) => item._id !== id) as CartItem[];
    console.log("[CartScreen] (guest) removeItem → new cart:", updatedCart);
    setCart(updatedCart);
    localStorage.setItem("guest_cart", JSON.stringify(updatedCart));

    Toast.show({
      type: 'error',
      text1: 'Item Removed',
      text2: `${thisItem.name} removed from cart`,
    });
  }
};




const addToCart = async (item: FoodItem) => {
  // Add loading state
  setAddingToCart(prev => new Set(prev).add(item._id));

  if (userLoggedIn && userData) {
    const vendorId = cart[0]?.vendorId;
    if (!vendorId) {
      Toast.show({
        type: "error",
        text1: "Vendor Error",
        text2: "Cannot add items without a vendor selected",
      });
      // Remove loading state
      setAddingToCart(prev => {
        const newSet = new Set(prev);
        newSet.delete(item._id);
        return newSet;
      });
      return;
    }

    console.log(
      `[CartScreen] ▶︎ POST /cart/add/${userData._id} { itemId: ${item._id}, kind: ${item.kind}, quantity: 1, vendorId: ${vendorId} }`
    );

    try {
      const headers = await getAuthHeaders();

      await axios.post(
        `${config.backendUrl}/cart/add/${userData._id}`,
        {
          itemId: item._id,
          kind: item.kind,
          quantity: 1,
          vendorId: vendorId,
        },
        headers
      );

      console.log(`[CartScreen] ← /cart/add succeeded, re-fetching cart`);

      Toast.show({
        type: "success",
        text1: "Added to Cart",
        text2: `${item.name} added to cart!`,
      });

      reFetchCart();
    } catch (err: any) {
      console.error(`[CartScreen] ❌ /cart/add error:`, err);
      const errorMsg = err.response?.data?.message || "";

      if (errorMsg.includes("max quantity")) {
        Toast.show({
          type: "warning",
          text1: "Limit Reached",
          text2: `Maximum limit reached for ${item.name}`,
        });
      } else if (errorMsg.includes("Only")) {
        Toast.show({
          type: "warning",
          text1: "Limited Stock",
          text2: `Only ${errorMsg.split("Only ")[1]} available for ${item.name}`,
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Add Failed",
          text2: "Failed to add item to cart",
        });
      }
    } finally {
      // Remove loading state
      setAddingToCart(prev => {
        const newSet = new Set(prev);
        newSet.delete(item._id);
        return newSet;
      });
    }
  } else {
    const existingItem = cart.find((i) => i._id === item._id);

    const updatedCart = existingItem
      ? cart.map((i) =>
          i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
        )
      : [
          ...cart,
          {
            _id: item._id,
            userId: "guest",
            foodcourtId: "guest",
            itemId: {
              _id: item._id,
              name: item.name,
              price: item.price,
              image: item.image,
              kind: item.kind || "Retail",
            },
            quantity: 1,
            kind: item.kind || "Retail",
            name: item.name,
            price: item.price,
            image: item.image,
            vendorName: "guest",
            vendorId: "guest",
            
            category: (item.kind === "Retail" ? "Retail" : "Produce") as "Retail" | "Produce",

          },
        ]

    console.log("[CartScreen] (guest) addToCart → new cart:", updatedCart);
    setCart(updatedCart);

    await AsyncStorage.setItem("guest_cart", JSON.stringify(updatedCart));

    Toast.show({
      type: "success",
      text1: "Added to Cart",
      text2: `${item.name} added to cart!`,
    });
    
    // Remove loading state for guest
    setAddingToCart(prev => {
      const newSet = new Set(prev);
      newSet.delete(item._id);
      return newSet;
    });
  }
};

  // Filter out items that are already in cart
  const filteredExtras = extras.filter(
    (extra) => !cart.some((cartItem) => cartItem._id === extra._id)
  );

  // TEMP DEBUG: Add a test item to guest cart
  const addTestItemToGuestCart = async () => {
    const testItem = {
      _id: 'test123',
      userId: 'guest',
      foodcourtId: 'guest',
      itemId: {
        _id: 'test123',
        name: 'Test Item',
        price: 99,
        image: '',
        kind: 'Retail',
      },
      quantity: 1,
      kind: 'Retail',
      name: 'Test Item',
      price: 99,
      image: '',
      vendorName: 'guest',
      vendorId: 'guest',
      category: 'Retail',
    };
    const rawGuest = await AsyncStorage.getItem('guest_cart') || '[]';
    const guestCart = JSON.parse(rawGuest);
    guestCart.push(testItem);
    await AsyncStorage.setItem('guest_cart', JSON.stringify(guestCart));
    setCart(guestCart);
    console.log('[Cart] Added test item to guest cart:', guestCart);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await reFetchCart();
    setRefreshing(false);
  };

 return (
    <View style={styles.container}>
      <Toast position="bottom" config={toastConfig} />
      {/* TEMP DEBUG BUTTON: Add test item to guest cart */}
      {/* <Button title="Add Test Item to Guest Cart" onPress={addTestItemToGuestCart} /> */}
      <ScrollView
        contentContainerStyle={styles.cartLeft}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4ea199"]} />
        }
      >
        {/* Debug info */}
        {cart.length === 0 ? (
          <View style={styles.emptyCartMessage}>
            <Text style={styles.emptyTitle}>Oops! Your cart is empty</Text>
            <Text style={styles.emptyText}>Looks like you haven't added any items yet.</Text>
            <TouchableOpacity style={styles.homeButton} onPress={() => router.push('/help/HelpPage')}>
              <Text style={styles.buttonText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.vendorInfo, {borderWidth: 1, borderColor: '#f00'}]}>
              <Text style={styles.vendorText}>Vendor: {getVendorName(cart[0]?.vendorName)}</Text>
            </View>

            {/* Cart items scrollable section */}
            <View style={{ height: 350, maxHeight: 400, marginBottom: 16, ...(Platform.OS === 'web' ? { zIndex: 0, position: 'relative' } : {}) }}>
              <ScrollView>
                {cart.map((item) => (
                  <View key={item._id} style={{ minHeight: 80, marginVertical: 4 }}>
                    <CartItemCard 
                      item={item} 
                      onIncrease={() => increaseQty(item._id)}
                      onDecrease={() => decreaseQty(item._id)}
                      onRemove={() => removeItem(item._id)}
                      isLoading={loadingItems.has(item._id)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={[styles.extrasSection, {borderWidth: 1, borderColor: '#00f'}]}>
              <Text style={styles.sectionTitle}>More from {getVendorName(cart[0]?.vendorName)}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.extrasList}>
                {filteredExtras.length > 0 ? (
                  filteredExtras.map((item) => {
                    const cartItem = cart.find((ci) => ci._id === item._id);
                    return (
                      <ExtrasCard
                        key={item._id}
                        item={item}
                        onAdd={addToCart}
                        onIncrease={increaseQty}
                        onDecrease={decreaseQty}
                        quantity={cartItem?.quantity || 0}
                        isLoading={addingToCart.has(item._id) || loadingItems.has(item._id)}
                      />
                    );
                  })
                ) : (
                  <Text style={styles.emptyExtras}>No extras available.</Text>
                )}
              </ScrollView>
            </View>

            {/* Move BillBox here */}
            {cart.length > 0 && userData && (
              <View style={[styles.cartRight, {borderWidth: 1, borderColor: '#fa0'}]}>
                <BillBox
                  userId={userData._id}
                  items={cart}
                  onOrder={(orderId) => {
                    console.log("🎉 Mobile Cart: Payment successful! Order ID: " + orderId);
                    console.log("🎉 Mobile Cart: Redirecting to payment page...");
                    // Clear cart and redirect to payment confirmation page
                    setCart([]);
                    router.push(`/payment?orderId=${orderId}`);
                  }}
                />
              </View>
            )}
          </>
        )}
        {refreshing && (
          <ActivityIndicator size="large" color="#4ea199" style={{ marginTop: 32 }} />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    paddingTop: 100,
    paddingHorizontal: 20,
    ...(Platform.OS === 'web' ? { zIndex: 0, position: 'relative' } : {}),
  },
  cartLeft: {
    paddingBottom: 40,
    ...(Platform.OS === 'web' ? { zIndex: 0, position: 'relative' } : {}),
  },
  emptyCartMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 20,
    ...(Platform.OS === 'web' ? { zIndex: 0, position: 'relative' } : {}),
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  homeButton: {
    backgroundColor: '#4ea199',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    ...(Platform.OS === 'web' ? { zIndex: 0, position: 'relative' } : {}),
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  vendorInfo: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    ...(Platform.OS === 'web' ? { zIndex: 0, position: 'relative' } : {}),
  },
  vendorText: {
    color: '#4ea199',
    fontSize: 18,
    fontWeight: '600',
  },
  extrasSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    ...(Platform.OS === 'web' ? { zIndex: 0, position: 'relative' } : {}),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#01796f',
    marginBottom: 10,
  },
  extrasList: {
    flexDirection: 'row',
    gap: 15,
    ...(Platform.OS === 'web' ? { zIndex: 0, position: 'relative' } : {}),
  },
  emptyExtras: {
    color: '#888',
  },
  cartRight: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    ...(Platform.OS === 'web'
      ? {
          zIndex: 0,
          position: 'relative',
        }
      : {
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        }),
  },
});
