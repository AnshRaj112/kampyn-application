import * as React from "react";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Linking,
  Modal,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as WebBrowser from "expo-web-browser";
import { WebView } from "react-native-webview";


import { CartItem, OrderType, OrderData } from "@/types/types";
import { config } from "../config";
import { getAuthHeaders } from "../cart/Cart";

interface Props {
  userId: string;
  items: CartItem[];
  onOrder: (orderId: string) => void;
}

const BillBox: React.FC<Props> = ({ userId, items, onOrder }: Props): React.ReactElement => {
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [charges, setCharges] = useState({ packingCharge: 5, deliveryCharge: 50 });
  const [vendorDeliverySettings, setVendorDeliverySettings] = useState<{ offersDelivery: boolean; deliveryPreparationTime: number } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentHtml, setPaymentHtml] = useState("");
  const [currentPaymentUrl, setCurrentPaymentUrl] = useState("");
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [showPopupModal, setShowPopupModal] = useState(false);
  const [popupUrl, setPopupUrl] = useState("");
  
  // Platform detection
  const isWeb = Platform.OS === 'web';
  const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

  // Load Razorpay script for web platform
  useEffect(() => {
    if (isWeb && typeof window !== 'undefined') {
      const loadRazorpayScript = () => {
        if (!(window as any).Razorpay) {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          script.onload = () => {
            console.log('✅ Razorpay script loaded for web platform');
          };
          script.onerror = () => {
            console.error('❌ Failed to load Razorpay script for web platform');
          };
          document.head.appendChild(script);
        }
      };

      loadRazorpayScript();
    }
  }, [isWeb]);

  // Web platform Razorpay integration (similar to web frontend)
  const handleWebRazorpayPayment = async (razorpayOptions: any, orderId: string) => {
    try {
      // Check if Razorpay is available on web
      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        console.error("❌ Razorpay not available on web platform");
        Alert.alert("Error", "Payment gateway not available. Please try again.");
        return;
      }

      const options = {
        ...razorpayOptions,
        description: "Complete your payment",
        prefill: { name, contact: phone },
        theme: { color: "#01796f" },
        handler: async (rzRes: any) => {
          console.log("💳 Web Razorpay payment success:", rzRes);

          try {
            const verifyPayload = {
              razorpay_order_id: rzRes.razorpay_order_id,
              razorpay_payment_id: rzRes.razorpay_payment_id,
              razorpay_signature: rzRes.razorpay_signature,
              orderId,
            };

            console.log("📨 Sending for verification:", verifyPayload);

            const verifyResponse = await axios.post(
              `${process.env.EXPO_PUBLIC_BACKEND_URL}/payment/verify`,
              verifyPayload,
              { withCredentials: true }
            );

            console.log("✅ Payment verified successfully:", verifyResponse.data);
            Alert.alert("Success", "Payment successful!");
            
            // Use the actual orderId from the verification response
            const actualOrderId = verifyResponse.data.orderId;
            
            if (!actualOrderId) {
              console.error("❌ No orderId returned from web payment verification");
              Alert.alert("Error", "Payment successful but order ID not received. Please contact support.");
              return;
            }
            
            onOrder(actualOrderId);
          } catch (error: any) {
            console.error("❌ Payment verification failed:", error);
            Alert.alert("Payment Error", "Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: async () => {
            console.warn("⚠️ Razorpay payment cancelled by user.");
            
            try {
              await axios.post(
                `${process.env.EXPO_PUBLIC_BACKEND_URL}/order/${orderId}/cancel`,
                {},
                { withCredentials: true }
              );
              console.log("✅ Order cancelled successfully");
              Alert.alert("Cancelled", "Payment was cancelled. You can try ordering again.");
            } catch (error) {
              console.error("❌ Failed to cancel order:", error);
              Alert.alert("Cancelled", "Payment was cancelled. You can try ordering again.");
            }
          },
        },
      };

      console.log("🚀 Launching Web Razorpay with options:", options);
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("❌ Could not open Web Razorpay:", error);
      Alert.alert("Error", "Could not open payment gateway.");
    }
  };

  // Handle WebView messages from Razorpay
  const handleWebViewMessage = async (event: any) => {
    try {
      console.log("📱 Raw WebView message:", event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);
      console.log("📱 Parsed WebView message:", data);

      if (data.type === 'payment_success') {
        console.log("✅ Payment success received, validating data...");
        
        // Validate payment data
        if (!data.razorpay_order_id || !data.razorpay_payment_id || !data.razorpay_signature) {
          console.error("❌ Missing payment data:", {
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature
          });
          Alert.alert("Error", "Payment data is incomplete. Please try again.");
          setShowPaymentModal(false);
          return;
        }

        console.log("🔍 Payment data validation passed:", {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature?.substring(0, 20) + "..." // Log partial signature for security
        });
        
        setIsProcessingPayment(true);
        setShowPaymentModal(false);

        try {
          const verifyPayload = {
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
            orderId: currentOrderId, // Include orderId like web frontend
          };
          
          console.log("📤 Sending payment verification request:", {
            url: `${process.env.EXPO_PUBLIC_BACKEND_URL}/payment/verify`,
            payload: {
              razorpay_order_id: verifyPayload.razorpay_order_id,
              razorpay_payment_id: verifyPayload.razorpay_payment_id,
              razorpay_signature: verifyPayload.razorpay_signature?.substring(0, 20) + "..." // Log partial signature for security
            }
          });

          const verifyResponse = await axios.post(
            `${process.env.EXPO_PUBLIC_BACKEND_URL}/payment/verify`,
            verifyPayload,
            { withCredentials: true }
          );
          
          console.log("✅ Payment verified successfully:", verifyResponse.data);
          Alert.alert("Success", "Payment successful!");
          
          // Use the actual orderId from the verification response
          const actualOrderId = verifyResponse.data.orderId;
          console.log("🎉 Mobile: Payment successful, redirecting to payment page with orderId:", actualOrderId);
          
          if (!actualOrderId) {
            console.error("❌ No orderId returned from payment verification");
            Alert.alert("Error", "Payment successful but order ID not received. Please contact support.");
            return;
          }
          
          onOrder(actualOrderId);
        } catch (error: any) {
          console.error("❌ Payment verification failed:", error);
          console.error("❌ Error response:", error.response?.data);
          console.error("❌ Error status:", error.response?.status);
          
          const errorMessage = error.response?.data?.message || error.message || "Payment verification failed. Please contact support.";
          Alert.alert("Payment Error", errorMessage);
        } finally {
          setIsProcessingPayment(false);
        }
      } else if (data.type === 'payment_success_from_url') {
        console.log("✅ Payment success detected from URL navigation:", data.url);
        setShowPaymentModal(false);
        Alert.alert("Success", "Payment successful! Redirecting to order confirmation.");
        
        // For test mode, we can extract payment details from the URL if needed
        try {
          const url = new URL(data.url);
          const params = new URLSearchParams(url.search);
          
          const paymentId = params.get('razorpay_payment_id');
          const orderId = params.get('razorpay_order_id');
          const signature = params.get('razorpay_signature');
          
          if (paymentId && orderId && signature) {
            console.log("🔍 Extracted payment details from success URL:", {
              paymentId,
              orderId,
              signature: signature.substring(0, 20) + "..."
            });
            
            // Process the payment verification
            setIsProcessingPayment(true);
            
            try {
              const verifyPayload = {
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature,
                orderId: currentOrderId, // Include orderId like web frontend
              };
              
              const verifyResponse = await axios.post(
                `${process.env.EXPO_PUBLIC_BACKEND_URL}/payment/verify`,
                verifyPayload,
                { withCredentials: true }
              );
              
              console.log("✅ Payment verified successfully from URL:", verifyResponse.data);
              
              // Use the actual orderId from the verification response
              const actualOrderId = verifyResponse.data.orderId;
              console.log("🎉 Payment successful from URL, redirecting with orderId:", actualOrderId);
              
              if (!actualOrderId) {
                console.error("❌ No orderId returned from payment verification from URL");
                Alert.alert("Error", "Payment successful but order ID not received. Please contact support.");
                return;
              }
              
              onOrder(actualOrderId);
            } catch (error: any) {
              console.error("❌ Payment verification failed from URL:", error);
              Alert.alert("Payment Error", "Payment verification failed. Please contact support.");
            } finally {
              setIsProcessingPayment(false);
            }
          } else {
            console.log("⚠️ No payment details found in success URL, proceeding with basic success");
            // For test mode, we might not have all details, so just show success
            Alert.alert("Success", "Payment completed successfully!");
          }
        } catch (error) {
          console.error("❌ Error parsing success URL:", error);
          Alert.alert("Success", "Payment completed successfully!");
        }
      } else if (data.type === 'payment_cancelled') {
        console.log("❌ Payment cancelled by user");
        setShowPaymentModal(false);
        Alert.alert("Cancelled", "Payment was cancelled. You can try ordering again.");
        try {
          if (currentOrderId) {
            await axios.post(
              `${process.env.EXPO_PUBLIC_BACKEND_URL}/order/${currentOrderId}/cancel`,
              {},
              { withCredentials: true }
            );
            console.log("✅ Order cancelled successfully");
          }
        } catch (cancelErr) {
          console.error("❌ Failed to cancel order:", cancelErr);
        }
      } else if (data.type === 'payment_error') {
        console.error("❌ Payment error from WebView:", data.error);
        setShowPaymentModal(false);
        Alert.alert("Payment Error", data.error || "Payment failed. Please try again.");
      } else if (data.type === 'popup_window') {
        console.log("🌐 Popup window requested from WebView:", data.url);
        // Handle Razorpay popup window
        if (data.url && (data.url.includes('razorpay.com') || 
                        data.url.includes('payment') || 
                        data.url.includes('success') ||
                        data.url.includes('verify'))) {
          console.log("✅ Opening Razorpay popup window:", data.url);
          setPopupUrl(data.url);
          setShowPopupModal(true);
        }
      } else {
        console.warn("⚠️ Unknown message type from WebView:", data.type);
      }
    } catch (error) {
      console.error("❌ Error parsing WebView message:", error);
      console.error("❌ Raw message was:", event.nativeEvent.data);
      Alert.alert("Error", "Failed to process payment response. Please try again.");
      setShowPaymentModal(false);
    }
  };

  // Fetch university charges when component mounts
  useEffect(() => {
    const fetchCharges = async () => {
      try {
        console.log("🔄 Mobile: Fetching charges for userId:", userId);
        
        // Get user's cart to find vendorId
        const cartResponse = await axios.get(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/cart/${userId}`,
          { withCredentials: true }
        );
        
        console.log("📦 Mobile: Cart response:", cartResponse.data);
        
        if (cartResponse.data.vendorId) {
          // Get vendor to find university
          const vendorResponse = await axios.get(
            `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/item/getvendors/${cartResponse.data.vendorId}`,
            { withCredentials: true }
          );
          
          console.log("🏪 Mobile: Vendor response:", vendorResponse.data);
          
          // Check both possible locations for uniID
          const uniID = vendorResponse.data.uniID || vendorResponse.data.data?.uniID;
          
          if (uniID) {
            // Get university charges
            const chargesResponse = await axios.get(
              `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/university/charges/${uniID}`,
              { withCredentials: true }
            );
            
            console.log("💰 Mobile: Charges response:", chargesResponse.data);
            
            setCharges({
              packingCharge: chargesResponse.data.packingCharge,
              deliveryCharge: chargesResponse.data.deliveryCharge,
            });
          } else {
            console.warn("⚠️ Mobile: No uniID found in vendor response. Response structure:", vendorResponse.data);
          }
        } else {
          console.warn("⚠️ Mobile: No vendorId found in cart response");
        }

        // Fetch vendor delivery settings
        if (cartResponse.data.vendorId) {
          try {
            console.log("🔄 Mobile: Fetching delivery settings for vendorId:", cartResponse.data.vendorId);
            
            const deliverySettingsResponse = await axios.get(
              `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/vendor/${cartResponse.data.vendorId}/delivery-settings`,
              { withCredentials: true }
            );
            
            console.log("📦 Mobile: Delivery settings response:", deliverySettingsResponse.data);
            
            if (deliverySettingsResponse.data.success) {
              setVendorDeliverySettings(deliverySettingsResponse.data.data);
            } else {
              console.error("❌ Mobile: Failed to fetch delivery settings:", deliverySettingsResponse.data.message);
              // If we can't fetch delivery settings, assume delivery is available
              setVendorDeliverySettings({ offersDelivery: true, deliveryPreparationTime: 30 });
            }
          } catch (error) {
            console.error("❌ Mobile: Failed to fetch delivery settings:", error);
            // If we can't fetch delivery settings, assume delivery is available
            setVendorDeliverySettings({ offersDelivery: true, deliveryPreparationTime: 30 });
          }
        }
      } catch (error) {
        console.error("❌ Mobile: Failed to fetch university charges:", error);
        // Use default charges if fetch fails
        console.log("🔄 Mobile: Using default charges:", { packingCharge: 5, deliveryCharge: 50 });
      }
    };

    fetchCharges();
  }, [userId]);

  // Auto-switch to takeaway if delivery is disabled
  useEffect(() => {
    if (vendorDeliverySettings && !vendorDeliverySettings.offersDelivery && orderType === "delivery") {
      console.log("🔄 Mobile: Delivery disabled by vendor, switching to takeaway");
      setOrderType("takeaway");
    }
  }, [vendorDeliverySettings, orderType]);

  // Debug logging
  console.log("🔍 BillBox Debug:", {
    platform: Platform.OS,
    isWeb,
    isMobile,
    items: items.map(i => ({ name: i.name, category: i.category, packable: i.packable, quantity: i.quantity })),
    orderType,
    charges,
    packableItems: items.filter(i => i.packable === true),
    vendorDeliverySettings
  });
  
  // More robust packable item detection (match web): Produce always packable; Retail based on flag
  const packableItems = items.filter((i) => {
    // Some carts provide category; if Produce, always packable
    const isProduce = (i as any).category === "Produce";
    if (isProduce) return true;
    return i.packable === true;
  });
  
  console.log("📦 Mobile Packable items found:", packableItems.map(i => ({ name: i.name, packable: i.packable, quantity: i.quantity })));
  
  // Ensure charges are available
  const packingCharge = charges.packingCharge || 5;
  const deliveryCharge = charges.deliveryCharge || 50;
  const platformFee = 2; // Match web BillBox flat fee
  
  const itemTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const packaging =
    orderType !== "dinein"
      ? packableItems.reduce((s, i) => s + packingCharge * i.quantity, 0)
      : 0;
  const delivery = orderType === "delivery" ? deliveryCharge : 0;
  const grandTotal = itemTotal + packaging + delivery + platformFee;
  
  console.log("💰 Mobile BillBox Calculation:", {
    itemTotal,
    packaging,
    delivery,
    grandTotal,
    packableItemsCount: packableItems.length,
    packingChargePerItem: packingCharge,
    deliveryCharge: deliveryCharge,
    items: items.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      packable: item.packable,
      total: item.price * item.quantity
    }))
  });

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || (orderType === "delivery" && !address.trim())) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    console.log("🔍 Mobile: Order submission details:", {
      userId,
      userLoggedIn: !!userId,
      cartItemsCount: items.length,
      cartItems: items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        packable: item.packable,
        kind: item.kind
      }))
    });

    const payload: OrderData = {
      orderType,
      collectorName: name,
      collectorPhone: phone,
      ...(orderType === "delivery" ? { address } : {}),
    };

    try {
      // Get auth headers
      const authHeaders = await getAuthHeaders();
      console.log("🔐 Mobile: Auth headers being sent:", {
        hasAuthorization: !!authHeaders.headers.Authorization,
        withCredentials: true
      });

      console.log("📤 Mobile: Sending order request:", {
        userId,
        payload,
        cartItemsCount: items.length,
        cartItems: items.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          packable: item.packable,
          kind: item.kind
        }))
      });

      // Create order using same API as web frontend
      const orderResp = await axios.post(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/order/${userId}`,
        payload,
        { withCredentials: true, headers: authHeaders.headers }
      );
      
      console.log("📱 Mobile: Order creation response:", orderResp.data);
      
      const { orderId, razorpayOptions } = orderResp.data || {};
      if (!razorpayOptions?.order_id) {
        console.error("❌ Mobile: Missing razorpay options:", razorpayOptions);
        Alert.alert("Error", "Failed to initialize payment. Missing payment options.");
        return;
      }
      
      // Store the razorpay order ID for cancellation purposes
      setCurrentOrderId(razorpayOptions.order_id);

      console.log("🚀 Opening Razorpay with options:", razorpayOptions);

      // Platform-specific payment handling
      if (isWeb) {
        // Use direct Razorpay integration for web platform (like web frontend)
        console.log("🌐 Using web platform Razorpay integration");
        await handleWebRazorpayPayment(razorpayOptions, orderId);
      } else {
        // Use WebView for mobile platforms
        console.log("📱 Using mobile platform WebView integration");
        
        // Create HTML content that opens Razorpay immediately
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
          </head>
          <body style="margin: 0; padding: 0; background: #f5f5f5;">
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
              <div style="text-align: center; padding: 20px;">
                <h2 style="color: #01796f; margin-bottom: 10px;">Opening Payment Gateway...</h2>
                <p>Please wait while we connect you to Razorpay</p>
              </div>
            </div>
            
            <script>
              // Override window.open to handle popup windows properly
              const originalWindowOpen = window.open;
              window.open = function(url, target, features) {
                console.log("🌐 window.open called with:", { url, target, features });
                
                // For Razorpay popup windows, notify React Native
                if (url && (url.includes('razorpay.com') || url.includes('payment') || url.includes('success') || url.includes('verify'))) {
                  console.log("✅ Razorpay popup window detected, notifying React Native");
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'popup_window',
                    url: url,
                    target: target,
                    features: features
                  }));
                  
                  // Return a mock window object
                  return {
                    close: function() {
                      console.log("🔄 Mock popup window closed");
                    },
                    focus: function() {
                      console.log("🔄 Mock popup window focused");
                    }
                  };
                }
                
                // For other URLs, use original window.open
                return originalWindowOpen.call(window, url, target, features);
              };
              
              // Open Razorpay immediately when page loads
              window.onload = function() {
                console.log("🌐 Razorpay checkout page loaded");
                
                // Check if Razorpay is loaded
                if (typeof Razorpay === 'undefined') {
                  console.error("❌ Razorpay SDK not loaded");
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'payment_error',
                    error: 'Failed to load payment gateway'
                  }));
                  return;
                }
                
                var options = {
                  key: "${razorpayOptions.key}",
                  amount: ${razorpayOptions.amount},
                  currency: "${razorpayOptions.currency}",
                  order_id: "${razorpayOptions.order_id}",
                  name: "KAMPYN",
                  description: "Complete your payment",
                  prefill: {
                    name: "${name.replace(/"/g, '\\"')}",
                    contact: "${phone}"
                  },
                  theme: {
                    color: "#01796f"
                  },
                  handler: function(response) {
                    console.log("💳 Razorpay payment success response:", response);
                    
                    // Validate response fields
                    if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
                      console.error("❌ Missing required fields in Razorpay response:", {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                      });
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'payment_error',
                        error: 'Missing payment details'
                      }));
                      return;
                    }
                    
                    const paymentData = {
                      type: 'payment_success',
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature
                    };
                    
                    console.log("📤 Sending payment data to React Native:", paymentData);
                    window.ReactNativeWebView.postMessage(JSON.stringify(paymentData));
                  },
                  modal: {
                    ondismiss: function() {
                      console.log("❌ Razorpay modal dismissed by user");
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'payment_cancelled'
                      }));
                    }
                  },
                  notes: {
                    "address": "KAMPYN Food Order",
                    "merchant_order_id": "${razorpayOptions.order_id}"
                  }
                };
                
                try {
                  var rzp = new Razorpay(options);
                  rzp.open();
                  console.log("✅ Razorpay modal opened successfully");
                } catch (error) {
                  console.error("❌ Failed to open Razorpay:", error);
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'payment_error',
                    error: 'Failed to open payment gateway: ' + error.message
                  }));
                }
              };
            </script>
          </body>
          </html>
        `;

        // Set the HTML content and show the payment modal
        setPaymentHtml(htmlContent);
        setShowPaymentModal(true);
      }
      
    } catch (error: any) {
      console.error("❌ Failed to create order:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
      console.error("❌ Error message:", error.message);
      Alert.alert("Error", error?.response?.data?.message || "Failed to create payment order. Please try again.");
    }
  };



  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.segmentedControl}>
          {(["takeaway", "delivery", "dinein"] as OrderType[]).map((t) => {
            // Hide delivery option if vendor doesn't offer delivery
            if (t === "delivery" && vendorDeliverySettings && !vendorDeliverySettings.offersDelivery) {
              return null;
            }
            
            return (
              <TouchableOpacity
                key={t}
                style={[styles.segment, orderType === t && styles.activeSegment]}
                onPress={() => setOrderType(t)}
              >
                <Text style={orderType === t ? styles.activeText : styles.segmentText}>
                  {t === "takeaway" ? "Takeaway" : t === "delivery" ? "Delivery" : "Dine In"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        {orderType === "delivery" && (
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Delivery Address"
            multiline
            numberOfLines={4}
            value={address}
            onChangeText={setAddress}
          />
        )}

        <View
          style={[
            styles.bill,
            orderType === "delivery" ? styles.billDelivery : styles.billRegular,
          ]}
        >
          <ScrollView style={styles.items}>
            {items.map((i) => (
              <View key={i._id} style={styles.line}>
                <Text>{i.name} ×{i.quantity}</Text>
                <Text>₹{i.price * i.quantity}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Estimated Preparation Time */}
          {vendorDeliverySettings && (
            <View style={styles.preparationTime}>
              <Text style={styles.preparationTimeText}>⏱️ Estimated preparation time: </Text>
              <Text style={styles.preparationTimeText}>{vendorDeliverySettings.deliveryPreparationTime} minutes</Text>
            </View>
          )}

          {packaging > 0 && (
            <View style={styles.extra}>
              <Text style={styles.extraText}>Packaging</Text>
              <Text style={styles.extraText}>₹{packaging}</Text>
            </View>
          )}
          {delivery > 0 && (
            <View style={styles.extra}>
              <Text style={styles.extraText}>Delivery Charge</Text>
              <Text style={styles.extraText}>₹{delivery}</Text>
            </View>
          )}

          {/* Platform Fee */}
          <View style={styles.extra}>
            <Text style={styles.extraText}>Platform Fee</Text>
            <Text style={styles.extraText}>₹{platformFee}</Text>
          </View>

          <View style={styles.divider} />

                  <View style={styles.total}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalText}>₹{grandTotal}</Text>
        </View>
        </View>

              <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>
          {isWeb ? "Proceed to Payment (Web)" : "Proceed to Payment (Mobile)"}
        </Text>
      </TouchableOpacity>
      </ScrollView>

      {/* Payment Modal with WebView - Only for mobile platforms */}
      {isMobile && (
        <Modal
          visible={showPaymentModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
        {isProcessingPayment && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Processing Payment...</Text>
              <Text style={styles.loadingSubtext}>Please wait, do not close this window</Text>
            </View>
          </View>
        )}
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Complete Payment</Text>
            <View style={styles.modalHeaderButtons}>
              {/* Debug button to show current URL */}
              <TouchableOpacity
                style={styles.debugButton}
                onPress={() => {
                  if (currentPaymentUrl) {
                    Alert.alert(
                      "Current Payment URL", 
                      currentPaymentUrl,
                      [
                        { text: "Copy", onPress: () => console.log("URL copied:", currentPaymentUrl) },
                        { text: "OK" }
                      ]
                    );
                  } else {
                    Alert.alert("Debug Info", "No URL captured yet");
                  }
                }}
              >
                <Text style={styles.debugButtonText}>🔍</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowPaymentModal(false);
                  Alert.alert("Cancelled", "Payment was cancelled. You can try ordering again.");
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <WebView
            source={{ html: paymentHtml, baseUrl: process.env.EXPO_PUBLIC_BACKEND_URL }}
            style={styles.webview}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            javaScriptCanOpenWindowsAutomatically={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="always"
            thirdPartyCookiesEnabled={true}
            setSupportMultipleWindows={true}
            sharedCookiesEnabled={true}
            // Enhanced WebView settings for Razorpay
            allowsBackForwardNavigationGestures={false}
            allowsLinkPreview={false}
            cacheEnabled={false}
            incognito={false}
            // Security settings
            originWhitelist={['*']}
            // Allow popup windows for Razorpay payment confirmation
            allowsFullscreenVideo={true}
            allowsProtectedMedia={true}
            allowsAirPlayForMediaPlayback={true}
            onOpenWindow={(e: any) => {
              try {
                const targetUrl = e.nativeEvent?.targetUrl;
                console.log("🌐 WebView popup window requested:", targetUrl);
                if (targetUrl) {
                  setCurrentPaymentUrl(targetUrl);
                  // Handle Razorpay's payment confirmation popup
                  if (targetUrl.includes('razorpay.com') || 
                      targetUrl.includes('payment') || 
                      targetUrl.includes('success') ||
                      targetUrl.includes('verify') ||
                      targetUrl.includes('callback')) {
                    console.log("✅ Opening Razorpay popup window in separate modal:", targetUrl);
                    setPopupUrl(targetUrl);
                    setShowPopupModal(true);
                  }
                }
              } catch (error) {
                console.error("❌ Error handling popup window:", error);
              }
            }}
            // Additional settings for better compatibility
            bounces={false}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            // Better error handling
            onError={(syntheticEvent: any) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ WebView error:', nativeEvent);
              Alert.alert("Error", "Failed to load payment gateway. Please try again.");
              setShowPaymentModal(false);
            }}
            onHttpError={(syntheticEvent: any) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ WebView HTTP error:', nativeEvent);
              Alert.alert("Error", "Payment gateway connection failed. Please try again.");
              setShowPaymentModal(false);
            }}
            onLoadEnd={() => {
              console.log("✅ WebView loaded successfully");
              // Add a small delay to ensure JavaScript is fully executed
              setTimeout(() => {
                console.log("🔄 WebView JavaScript execution completed");
              }, 500);
            }}
            onLoadStart={() => {
              console.log("🔄 WebView loading started");
            }}
            // Handle navigation changes and capture verification URLs
            onNavigationStateChange={(navState: any) => {
              console.log("🌐 WebView navigation:", navState.url);
              
              // Store current URL for debugging
              if (navState.url) {
                setCurrentPaymentUrl(navState.url);
                console.log("🔗 Current payment URL:", navState.url);
              }
              
              // Check if this is a Razorpay verification URL or any payment-related URL
              if (navState.url && (
                navState.url.includes('razorpay.com') || 
                navState.url.includes('payment') ||
                navState.url.includes('verify') ||
                navState.url.includes('success') ||
                navState.url.includes('failure') ||
                navState.url.includes('callback') ||
                navState.url.includes('return') ||
                navState.url.includes('redirect')
              )) {
                                  console.log("🔍 Detected Razorpay navigation:", navState.url);
                  
                  // For test mode, show the URL for debugging
                  if (navState.url.includes('success') || navState.url.includes('verify') || navState.url.includes('callback')) {
                    console.log("🎯 IMPORTANT: Payment verification URL captured:", navState.url);
                    // You can uncomment the next line to automatically show the URL
                    // Alert.alert("Payment URL Captured", navState.url);
                  }
                  
                  // Extract payment details from URL if available
                  try {
                  const url = new URL(navState.url);
                  const params = new URLSearchParams(url.search);
                  
                  const paymentId = params.get('razorpay_payment_id');
                  const orderId = params.get('razorpay_order_id');
                  const signature = params.get('razorpay_signature');
                  
                  if (paymentId && orderId && signature) {
                    console.log("✅ Found payment details in URL:", {
                      paymentId,
                      orderId,
                      signature: signature.substring(0, 20) + "..."
                    });
                    
                    // Send payment success message
                    handleWebViewMessage({
                      nativeEvent: {
                        data: JSON.stringify({
                          type: 'payment_success',
                          razorpay_order_id: orderId,
                          razorpay_payment_id: paymentId,
                          razorpay_signature: signature
                        })
                      }
                    });
                  } else if (navState.url.includes('success')) {
                    console.log("✅ Payment success page detected");
                    // Handle success page
                    handleWebViewMessage({
                      nativeEvent: {
                        data: JSON.stringify({
                          type: 'payment_success_from_url',
                          url: navState.url
                        })
                      }
                    });
                  } else if (navState.url.includes('failure') || navState.url.includes('cancel')) {
                    console.log("❌ Payment failure/cancel page detected");
                    // Handle failure page
                    handleWebViewMessage({
                      nativeEvent: {
                        data: JSON.stringify({
                          type: 'payment_cancelled',
                          url: navState.url
                        })
                      }
                    });
                  }
                } catch (error) {
                  console.error("❌ Error parsing navigation URL:", error);
                }
              }
            }}
            // Handle load progress
            onLoadProgress={(syntheticEvent: any) => {
              const { nativeEvent } = syntheticEvent;
              console.log("📊 WebView load progress:", nativeEvent.progress);
            }}
          />
        </View>
        </Modal>
      )}

      {/* Payment Processing Modal */}
      <Modal
        visible={isProcessingPayment}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Processing Payment...</Text>
            <Text style={styles.loadingSubtext}>Please wait, do not close this window</Text>
          </View>
        </View>
      </Modal>

      {/* Razorpay Popup Modal - For payment confirmation */}
      {isMobile && (
        <Modal
          visible={showPopupModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Confirmation</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowPopupModal(false);
                  setPopupUrl("");
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <WebView
              source={{ uri: popupUrl }}
              style={styles.webview}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              javaScriptCanOpenWindowsAutomatically={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              mixedContentMode="always"
              thirdPartyCookiesEnabled={true}
              setSupportMultipleWindows={true}
              sharedCookiesEnabled={true}
              allowsBackForwardNavigationGestures={true}
              allowsLinkPreview={false}
              cacheEnabled={false}
              incognito={false}
              originWhitelist={['*']}
              onNavigationStateChange={(navState: any) => {
                console.log("🌐 Popup WebView navigation:", navState.url);
                
                // Check if this is a payment success/failure page
                if (navState.url && (
                  navState.url.includes('success') ||
                  navState.url.includes('failure') ||
                  navState.url.includes('verify') ||
                  navState.url.includes('callback')
                )) {
                  console.log("🎯 Payment confirmation page detected:", navState.url);
                  
                  // Extract payment details from URL if available
                  try {
                    const url = new URL(navState.url);
                    const params = new URLSearchParams(url.search);
                    
                    const paymentId = params.get('razorpay_payment_id');
                    const orderId = params.get('razorpay_order_id');
                    const signature = params.get('razorpay_signature');
                    
                    if (paymentId && orderId && signature) {
                      console.log("✅ Found payment details in popup URL:", {
                        paymentId,
                        orderId,
                        signature: signature.substring(0, 20) + "..."
                      });
                      
                      // Send payment success message
                      handleWebViewMessage({
                        nativeEvent: {
                          data: JSON.stringify({
                            type: 'payment_success',
                            razorpay_order_id: orderId,
                            razorpay_payment_id: paymentId,
                            razorpay_signature: signature
                          })
                        }
                      });
                      
                      // Close popup modal
                      setShowPopupModal(false);
                      setPopupUrl("");
                    } else if (navState.url.includes('success')) {
                      console.log("✅ Payment success page detected in popup");
                      // Handle success page
                      handleWebViewMessage({
                        nativeEvent: {
                          data: JSON.stringify({
                            type: 'payment_success_from_url',
                            url: navState.url
                          })
                        }
                      });
                      
                      // Close popup modal
                      setShowPopupModal(false);
                      setPopupUrl("");
                    } else if (navState.url.includes('failure') || navState.url.includes('cancel')) {
                      console.log("❌ Payment failure/cancel page detected in popup");
                      // Handle failure page
                      handleWebViewMessage({
                        nativeEvent: {
                          data: JSON.stringify({
                            type: 'payment_cancelled',
                            url: navState.url
                          })
                        }
                      });
                      
                      // Close popup modal
                      setShowPopupModal(false);
                      setPopupUrl("");
                    }
                  } catch (error) {
                    console.error("❌ Error parsing popup navigation URL:", error);
                  }
                }
              }}
              onError={(syntheticEvent: any) => {
                const { nativeEvent } = syntheticEvent;
                console.error('❌ Popup WebView error:', nativeEvent);
                Alert.alert("Error", "Failed to load payment confirmation page. Please try again.");
                setShowPopupModal(false);
                setPopupUrl("");
              }}
              onHttpError={(syntheticEvent: any) => {
                const { nativeEvent } = syntheticEvent;
                console.error('❌ Popup WebView HTTP error:', nativeEvent);
                Alert.alert("Error", "Payment confirmation page connection failed. Please try again.");
                setShowPopupModal(false);
                setPopupUrl("");
              }}
            />
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    fontFamily: "ShadowsIntoLight-Regular", // You must load this font via `expo-font`
    backgroundColor: "#e0f5f3",
    padding: 16,
    borderRadius: 16,
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    gap: 10,
  },
  segmentedControl: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  segment: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  activeSegment: {
    backgroundColor: "#01796f",
    borderColor: "#01796f",
  },
  segmentText: {
    color: "#333",
  },
  activeText: {
    color: "#fff",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textarea: {
    height: 100,
    textAlignVertical: "top",
  },
  bill: {
    backgroundColor: "#f7faf9",
    padding: 12,
    borderRadius: 12,
    flexDirection: "column",
    gap: 8,
  },
  billDelivery: {
    height: 200,
  },
  billRegular: {
    height: 288,
  },
  items: {
    maxHeight: 140,
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  extra: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  extraText: {
    fontStyle: "italic",
    color: "#555",
  },
  preparationTime: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffeaa7",
    marginVertical: 8,
  },
  preparationTimeText: {
    fontSize: 12,
    color: "#856404",
  },
  divider: {
    height: 1,
    backgroundColor: "#bbb",
    marginVertical: 10,
  },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#01796f",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#01796f",
  },
  modalHeaderButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  debugButton: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 4,
  },
  debugButtonText: {
    fontSize: 16,
    color: "#fff",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
  },
  webview: {
    flex: 1,
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#01796f',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default BillBox;
