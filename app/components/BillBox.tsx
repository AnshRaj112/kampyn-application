import React, { useState, useEffect } from "react";
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

const BillBox: React.FC<Props> = ({ userId, items, onOrder }) => {
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
          };
          
          console.log("📤 Sending payment verification request:", {
            url: `${config.backendUrl}/payment/verify`,
            payload: {
              razorpay_order_id: verifyPayload.razorpay_order_id,
              razorpay_payment_id: verifyPayload.razorpay_payment_id,
              razorpay_signature: verifyPayload.razorpay_signature?.substring(0, 20) + "..." // Log partial signature for security
            }
          });

          const verifyResponse = await axios.post(
            `${config.backendUrl}/payment/verify`,
            verifyPayload,
            { withCredentials: true }
          );
          
          console.log("✅ Payment verified successfully:", verifyResponse.data);
          Alert.alert("Success", "Payment successful!");
          
          // Use the actual orderId from the verification response
          const actualOrderId = verifyResponse.data.orderId;
          console.log("🎉 Mobile: Payment successful, redirecting to payment page with orderId:", actualOrderId);
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
              };
              
              const verifyResponse = await axios.post(
                `${config.backendUrl}/payment/verify`,
                verifyPayload,
                { withCredentials: true }
              );
              
              console.log("✅ Payment verified successfully from URL:", verifyResponse.data);
              
              // Use the actual orderId from the verification response
              const actualOrderId = verifyResponse.data.orderId;
              console.log("🎉 Payment successful from URL, redirecting with orderId:", actualOrderId);
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
      } else if (data.type === 'payment_error') {
        console.error("❌ Payment error from WebView:", data.error);
        setShowPaymentModal(false);
        Alert.alert("Payment Error", data.error || "Payment failed. Please try again.");
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
          `${config.backendUrl}/cart/${userId}`,
          { withCredentials: true }
        );
        
        console.log("📦 Mobile: Cart response:", cartResponse.data);
        
        if (cartResponse.data.vendorId) {
          // Get vendor to find university
          const vendorResponse = await axios.get(
            `${config.backendUrl}/api/item/getvendors/${cartResponse.data.vendorId}`,
            { withCredentials: true }
          );
          
          console.log("🏪 Mobile: Vendor response:", vendorResponse.data);
          
          // Check both possible locations for uniID
          const uniID = vendorResponse.data.uniID || vendorResponse.data.data?.uniID;
          
          if (uniID) {
            // Get university charges
            const chargesResponse = await axios.get(
              `${config.backendUrl}/api/university/charges/${uniID}`,
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
              `${config.backendUrl}/api/vendor/${cartResponse.data.vendorId}/delivery-settings`,
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
  console.log("🔍 Mobile BillBox Debug:", {
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
      // Check if user is actually logged in
      const token = await AsyncStorage.getItem("token");
      console.log("🔐 Mobile: Authentication check:", {
        userId,
        hasToken: !!token,
        tokenLength: token?.length || 0
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

      // Get auth headers for debugging
      const authHeaders = await getAuthHeaders();
      console.log("🔐 Mobile: Auth headers being sent:", {
        hasAuthorization: !!authHeaders.headers.Authorization,
        withCredentials: true
      });

      // For mobile, we don't need to create an order yet - we'll do it after payment
      // Just get the vendorId and other details needed for payment
      const cartResponse = await axios.get(
        `${config.backendUrl}/cart/${userId}`,
        { 
          withCredentials: true,
          headers: authHeaders.headers
        }
      );

      const vendorId = cartResponse.data.vendorId;
      console.log("📱 Mobile: Got vendorId from cart:", vendorId);

      console.log("📱 Mobile: Cart response received:", {
        vendorId,
        frontendCalculatedTotal: grandTotal
      });

      // Create a new Razorpay order with the frontend amount
      try {
        const frontendAmountInPaise = Math.round(grandTotal * 100);
        
        // Validate amount
        if (frontendAmountInPaise <= 0) {
          console.error("❌ Invalid amount:", { grandTotal, frontendAmountInPaise });
          Alert.alert("Error", "Invalid order amount. Please try again.");
          return;
        }
        
        console.log("💳 Creating new Razorpay order with frontend amount:", {
          frontendCalculatedTotal: grandTotal,
          frontendAmountInPaise
        });

        // Create a new Razorpay order with the correct amount
        const createOrderPayload = {
          amount: Math.round(frontendAmountInPaise), // Ensure it's a proper integer
          currency: "INR",
          receipt: `mobile-${Date.now()}-${userId.slice(-6)}`
        };
        
        console.log("📤 Creating Razorpay order with payload:", createOrderPayload);
        
        // Validate payload before sending
        if (!createOrderPayload.amount || createOrderPayload.amount <= 0) {
          console.error("❌ Invalid amount in payload:", createOrderPayload);
          Alert.alert("Error", "Invalid order amount. Please try again.");
          return;
        }
        
        const newRazorpayResponse = await axios.post(
          `${config.backendUrl}/razorpay/create-order`,
          createOrderPayload,
          { 
            withCredentials: true,
            headers: authHeaders.headers
          }
        );

        const newRazorpayOrder = newRazorpayResponse.data;
        console.log("💳 New Razorpay order created:", newRazorpayOrder);
        
        // Validate the response
        if (!newRazorpayOrder || !newRazorpayOrder.id) {
          console.error("❌ Invalid Razorpay order response:", newRazorpayOrder);
          Alert.alert("Error", "Failed to create payment order. Please try again.");
          return;
        }
        
        // Verify amount matches
        if (newRazorpayOrder.amount !== frontendAmountInPaise) {
          console.error("❌ Amount mismatch:", {
            frontendAmount: frontendAmountInPaise,
            razorpayAmount: newRazorpayOrder.amount
          });
          Alert.alert("Error", "Payment amount mismatch. Please try again.");
          return;
        }

        // Store order details with the new Razorpay order ID
        const orderDetailsPayload = {
          razorpayOrderId: newRazorpayOrder.id,
          userId,
          cart: items,
          vendorId: vendorId,
          orderType,
          collectorName: name,
          collectorPhone: phone,
          address,
          packingCharge,
          deliveryCharge,
          platformFee,
          finalTotal: grandTotal
        };
        
        console.log("📦 Storing order details with payload:", {
          razorpayOrderId: orderDetailsPayload.razorpayOrderId,
          userId: orderDetailsPayload.userId,
          cartLength: orderDetailsPayload.cart.length,
          vendorId: orderDetailsPayload.vendorId,
          orderType: orderDetailsPayload.orderType,
          collectorName: orderDetailsPayload.collectorName,
          collectorPhone: orderDetailsPayload.collectorPhone,
          address: orderDetailsPayload.address,
          finalTotal: orderDetailsPayload.finalTotal
        });

        const storeOrderDetailsResponse = await axios.post(
          `${config.backendUrl}/order/store-details`,
          orderDetailsPayload,
          { 
            withCredentials: true,
            headers: authHeaders.headers
          }
        );

        console.log("📦 Order details stored successfully:", storeOrderDetailsResponse.data);

        // Get Razorpay key from backend
        let razorpayKey;
        try {
          const razorpayKeyResponse = await axios.get(
            `${config.backendUrl}/razorpay/key`,
            { 
              withCredentials: true,
              headers: authHeaders.headers
            }
          );

          razorpayKey = razorpayKeyResponse.data.key;
          console.log("🔑 Got Razorpay key from backend");
        } catch (error) {
          console.error("❌ Failed to get Razorpay key:", error);
          Alert.alert("Error", "Failed to initialize payment gateway. Please try again.");
          return;
        }

        // Use the new order details
        const updatedRazorpayOptions = {
          key: razorpayKey,
          amount: frontendAmountInPaise,
          currency: "INR",
          order_id: newRazorpayOrder.id,
        };

        console.log("🚀 Opening Razorpay with updated options:", {
          key: updatedRazorpayOptions.key,
          amount: updatedRazorpayOptions.amount,
          order_id: updatedRazorpayOptions.order_id,
          currency: updatedRazorpayOptions.currency
        });

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
              // Open Razorpay immediately when page loads
              window.onload = function() {
                var options = {
                  key: "${updatedRazorpayOptions.key}",
                  amount: ${updatedRazorpayOptions.amount},
                  currency: "${updatedRazorpayOptions.currency}",
                  order_id: "${updatedRazorpayOptions.order_id}",
                  name: "KIITBites",
                  description: "Complete your payment",
                  prefill: {
                    name: "${name}",
                    contact: "${phone}"
                  },
                  theme: {
                    color: "#01796f"
                  },
                  // Enhanced mobile configuration
                  config: {
                    display: {
                      blocks: {
                        banks: {
                          name: "Pay using UPI",
                          instruments: [
                            {
                              method: "upi"
                            }
                          ]
                        },
                        cards: {
                          name: "Pay using Card",
                          instruments: [
                            {
                              method: "card"
                            }
                          ]
                        },
                        netbanking: {
                          name: "Pay using Netbanking",
                          instruments: [
                            {
                              method: "netbanking"
                            }
                          ]
                        },
                        other: {
                          name: "Other Payment Methods",
                          instruments: [
                            {
                              method: "wallet"
                            },
                            {
                              method: "paylater"
                            }
                          ]
                        }
                      },
                      sequence: ["block.banks", "block.cards", "block.netbanking", "block.other"],
                      preferences: {
                        show_default_blocks: false
                      }
                    }
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
                  // Enhanced error handling
                  notes: {
                    "address": "KIITBites Food Order",
                    "merchant_order_id": "${updatedRazorpayOptions.order_id}"
                  },
                  // Better mobile experience
                  retry: {
                    enabled: true,
                    max_count: 3
                  },
                  // Auto-fill for better UX
                  auto_fill: {
                    method: "card"
                  }
                };
                var rzp = new Razorpay(options);
                rzp.open();
              };
            </script>
          </body>
          </html>
        `;

        // Use WebView for Razorpay checkout (works reliably in app)
        try {
          console.log("🌐 Opening Razorpay checkout in WebView...");
          
          // Create HTML content with Razorpay JavaScript SDK
          const razorpayHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
              <style>
                body { 
                  margin: 0; 
                  padding: 0; 
                  background: #f5f5f5; 
                  font-family: Arial, sans-serif; 
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                }
                .container { 
                  text-align: center; 
                  padding: 20px; 
                  background: white;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  max-width: 400px;
                  width: 90%;
                }
                .loading { 
                  color: #01796f; 
                  margin-bottom: 10px; 
                  font-size: 18px;
                  font-weight: bold;
                }
                .spinner {
                  border: 3px solid #f3f3f3;
                  border-top: 3px solid #01796f;
                  border-radius: 50%;
                  width: 30px;
                  height: 30px;
                  animation: spin 1s linear infinite;
                  margin: 10px auto;
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                .error {
                  color: #ff4444;
                  margin-top: 10px;
                }
                .cta {
                  margin-top: 16px;
                  background-color: #01796f;
                  color: #fff;
                  border: none;
                  padding: 10px 16px;
                  border-radius: 8px;
                  font-size: 16px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="loading">Opening Payment Gateway...</div>
                <div class="spinner"></div>
                <p>Please wait while we connect you to Razorpay</p>
                <div id="error" class="error" style="display: none;"></div>
                <button id="openBtn" class="cta" style="display: none;">Continue to Pay</button>
              </div>
              
              <script>
                window.onload = function() {
                  console.log("🌐 Razorpay checkout page loaded");
                  
                  // Add a small delay to ensure everything is loaded
                  setTimeout(function() {
                    // Check if Razorpay is loaded
                    if (typeof Razorpay === 'undefined') {
                      console.error("❌ Razorpay SDK not loaded");
                      document.getElementById('error').textContent = "Failed to load payment gateway. Please try again.";
                      document.getElementById('error').style.display = 'block';
                      document.getElementById('openBtn').style.display = 'inline-block';
                      return;
                    }
                    
                    console.log("✅ Razorpay SDK loaded successfully");
                  
                  var rzp = null;
                  var options = {
                    key: "${razorpayKey}",
                    amount: ${Math.round(frontendAmountInPaise)},
                    currency: "INR",
                    order_id: "${newRazorpayOrder.id}",
                    name: "KIITBites",
                    description: "Complete your payment",
                    prefill: {
                      name: "${name.replace(/"/g, '\\"')}",
                      contact: "${phone}",
                      email: "customer@example.com"
                    },
                    theme: {
                      color: "#01796f"
                    },
                    // Simplified configuration for better compatibility
                    config: {
                      display: {
                        blocks: {
                          banks: {
                            name: "Pay using UPI",
                            instruments: [{ method: "upi" }]
                          },
                          cards: {
                            name: "Pay using Card",
                            instruments: [{ method: "card" }]
                          },
                          netbanking: {
                            name: "Pay using Netbanking",
                            instruments: [{ method: "netbanking" }]
                          },
                          other: {
                            name: "Other Payment Methods",
                            instruments: [
                              { method: "wallet" },
                              { method: "paylater" }
                            ]
                          }
                        },
                        sequence: ["block.banks", "block.cards", "block.netbanking", "block.other"],
                        preferences: {
                          show_default_blocks: false
                        }
                      }
                    },
                    // Mobile-specific optimizations
                    readonly: {
                      name: true,
                      email: true,
                      contact: true
                    },

                    // Enhanced error handling
                    handler: function(response) {
                      console.log("✅ Payment success:", response);
                      
                      // Validate response
                      if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
                        console.error("❌ Invalid payment response:", response);
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'payment_error',
                          error: 'Invalid payment response'
                        }));
                        return;
                      }
                      
                      // Send success data back to React Native
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'payment_success',
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                      }));
                    },
                    modal: {
                      ondismiss: function() {
                        console.log("❌ Payment cancelled by user");
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'payment_cancelled'
                        }));
                      }
                    },
                    notes: {
                      "address": "KIITBites Food Order",
                      "merchant_order_id": "${newRazorpayOrder.id}"
                    },
                    retry: {
                      enabled: true,
                      max_count: 3
                    },
                    // Additional parameters for better card payment support
                    callback_url: "",
                    cancel_url: ""
                  };
                  
                  console.log("🔧 Razorpay options:", JSON.stringify(options, null, 2));
                  
                  // Additional validation
                  if (!options.key || !options.amount || !options.order_id) {
                    console.error("❌ Missing required Razorpay options:", {
                      hasKey: !!options.key,
                      hasAmount: !!options.amount,
                      hasOrderId: !!options.order_id
                    });
                    document.getElementById('error').textContent = "Invalid payment configuration";
                    document.getElementById('error').style.display = 'block';
                    return;
                  }
                  
                  try {
                    rzp = new Razorpay(options);
                    console.log("✅ Razorpay instance created");
                    
                    // Add timeout for payment modal (increased to 60 seconds)
                    var paymentTimeout = setTimeout(function() {
                      console.error("❌ Payment modal timeout - no response from Razorpay");
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'payment_error',
                        error: 'Payment gateway timeout. Please try again.'
                      }));
                    }, 60000); // 60 seconds timeout
                    
                    // Add modal dismiss handler to clear timeout
                    rzp.on('modal.dismiss', function() {
                      clearTimeout(paymentTimeout);
                      console.log("✅ Razorpay modal dismissed");
                    });
                    
                    // Try to open Razorpay with retry logic
                    var openAttempts = 0;
                    var maxOpenAttempts = 3;
                    
                    function tryOpenRazorpay() {
                      try {
                        rzp.open();
                        console.log("✅ Razorpay modal opened successfully");
                      } catch (openError) {
                        openAttempts++;
                        console.error("❌ Failed to open Razorpay (attempt " + openAttempts + "):", openError);
                        
                        if (openAttempts < maxOpenAttempts) {
                          console.log("🔄 Retrying to open Razorpay...");
                          setTimeout(tryOpenRazorpay, 1000); // Retry after 1 second
                        } else {
                          clearTimeout(paymentTimeout);
                          console.error("❌ Failed to open Razorpay after " + maxOpenAttempts + " attempts");
                          document.getElementById('error').textContent = "We couldn't auto-open the payment sheet. Tap Continue to proceed.";
                          document.getElementById('error').style.display = 'block';
                          var btn = document.getElementById('openBtn');
                          btn.style.display = 'inline-block';
                          btn.onclick = function() {
                            try {
                              if (rzp) {
                                rzp.open();
                              } else {
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                  type: 'payment_error',
                                  error: 'Payment gateway not initialized'
                                }));
                              }
                            } catch (e) {
                              window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'payment_error',
                                error: 'Failed to open payment gateway: ' + (e && e.message ? e.message : 'Unknown error')
                              }));
                            }
                          };
                        }
                      }
                    }
                    
                    tryOpenRazorpay();
                    
                    // Clear timeout on payment events
                    rzp.on('payment.failed', function (response) {
                      clearTimeout(paymentTimeout);
                      console.error("❌ Payment failed:", response.error);
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'payment_error',
                        error: response.error.description || 'Payment failed'
                      }));
                    });
                    
                    rzp.on('payment.success', function (response) {
                      clearTimeout(paymentTimeout);
                      console.log("✅ Payment success event triggered");
                    });
                  } catch (error) {
                    console.error("❌ Failed to create Razorpay instance:", error);
                    document.getElementById('error').textContent = "Failed to create payment gateway: " + error.message;
                    document.getElementById('error').style.display = 'block';
                    
                    // Send error back to React Native
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'payment_error',
                      error: 'Failed to create payment gateway: ' + error.message
                    }));
                  }
                }, 1000); // 1 second delay to ensure everything is loaded
              };
              </script>
            </body>
            </html>
          `;
          
          // Set the HTML content and show the payment modal
          setPaymentHtml(razorpayHtml);
          setShowPaymentModal(true);
          
        } catch (error: any) {
          console.error("❌ Failed to create payment HTML:", error);
          Alert.alert("Error", "Failed to create payment gateway. Please try again.");
        }
             } catch (error: any) {
         console.error("❌ Failed to create new Razorpay order:", error);
         console.error("❌ Error response:", error.response?.data);
         console.error("❌ Error status:", error.response?.status);
         console.error("❌ Error message:", error.message);
         Alert.alert("Error", "Failed to create payment order. Please try again.");
         return;
       }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to place order.");
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
        <Text style={styles.buttonText}>Proceed to Payment</Text>
      </TouchableOpacity>
      </ScrollView>

      {/* Payment Modal with WebView */}
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
            source={{ html: paymentHtml, baseUrl: config.backendUrl }}
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
            onOpenWindow={(e) => {
              try {
                const targetUrl = e.nativeEvent?.targetUrl;
                if (targetUrl) {
                  setCurrentPaymentUrl(targetUrl);
                }
              } catch (_) {}
            }}
            // Additional settings for better compatibility
            bounces={false}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            // Better error handling
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ WebView error:', nativeEvent);
              Alert.alert("Error", "Failed to load payment gateway. Please try again.");
              setShowPaymentModal(false);
            }}
            onHttpError={(syntheticEvent) => {
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
            onNavigationStateChange={(navState) => {
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
            onLoadProgress={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.log("📊 WebView load progress:", nativeEvent.progress);
            }}
          />
        </View>
      </Modal>

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
