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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RazorpayCheckout from "react-native-razorpay";
import axios from "axios";
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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);



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
      } catch (error) {
        console.error("❌ Mobile: Failed to fetch university charges:", error);
        // Use default charges if fetch fails
        console.log("🔄 Mobile: Using default charges:", { packingCharge: 5, deliveryCharge: 50 });
      }
    };

    fetchCharges();
  }, [userId]);

  // Debug logging
  console.log("🔍 Mobile BillBox Debug:", {
    items: items.map(i => ({ name: i.name, category: i.category, packable: i.packable, quantity: i.quantity })),
    orderType,
    charges,
    packableItems: items.filter(i => i.packable === true)
  });
  
  // More robust packable item detection
  const packableItems = items.filter((i) => i.packable === true);
  
  console.log("📦 Mobile Packable items found:", packableItems.map(i => ({ name: i.name, packable: i.packable, quantity: i.quantity })));
  
  // Ensure charges are available
  const packingCharge = charges.packingCharge || 5;
  const deliveryCharge = charges.deliveryCharge || 50;
  
  const itemTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const packaging =
    orderType !== "dinein"
      ? packableItems.reduce((s, i) => s + packingCharge * i.quantity, 0)
      : 0;
  const delivery = orderType === "delivery" ? deliveryCharge : 0;
  const grandTotal = itemTotal + packaging + delivery;
  
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
          amount: frontendAmountInPaise,
          currency: "INR",
          receipt: `mobile-${Date.now()}-${userId.slice(-6)}`
        };
        
        console.log("📤 Creating Razorpay order with payload:", createOrderPayload);
        
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

        // Use native RazorpayCheckout for Expo
        try {
          console.log("💳 Opening Razorpay checkout...");
          
          const options = {
            description: "Complete your payment",
            image: "https://your-logo-url.com/logo.png", // Optional: Add your logo
            currency: "INR",
            key: razorpayKey,
            amount: frontendAmountInPaise,
            name: "KIITBites",
            order_id: newRazorpayOrder.id,
            prefill: {
              email: "customer@example.com", // You can get this from user profile
              contact: phone,
              name: name,
            },
            theme: { color: "#01796f" },
            notes: {
              "address": "KIITBites Food Order",
              "merchant_order_id": newRazorpayOrder.id
            },
            modal: {
              ondismiss: () => {
                console.log("❌ Payment cancelled by user");
                Alert.alert("Cancelled", "Payment was cancelled. You can try ordering again.");
              }
            }
          };

          const data = await RazorpayCheckout.open(options);
          
          console.log("✅ Payment success:", data);
          
          // Handle successful payment
          if (data.razorpay_payment_id) {
            console.log("🔍 Payment data received:", {
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature?.substring(0, 20) + "..." // Log partial signature for security
            });

            setIsProcessingPayment(true);

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
          }
          
        } catch (error: any) {
          console.error("❌ Razorpay checkout failed:", error);
          
          if (error.code === 'PAYMENT_CANCELLED') {
            console.log("❌ Payment cancelled by user");
            Alert.alert("Cancelled", "Payment was cancelled. You can try ordering again.");
          } else {
            console.error("❌ Payment error:", error);
            Alert.alert("Payment Error", "Payment failed. Please try again.");
          }
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
          {(["takeaway", "delivery", "dinein"] as OrderType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.segment, orderType === t && styles.activeSegment]}
              onPress={() => setOrderType(t)}
            >
              <Text style={orderType === t ? styles.activeText : styles.segmentText}>
                {t === "takeaway" ? "Takeaway" : t === "delivery" ? "Delivery" : "Dine In"}
              </Text>
            </TouchableOpacity>
          ))}
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
