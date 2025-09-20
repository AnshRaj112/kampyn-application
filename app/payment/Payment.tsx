import { useRouter, useLocalSearchParams, useRootNavigationState } from "expo-router";
import { useState, useEffect } from "react";
import axios from "axios";
import { getToken, removeToken } from "../../utils/storage";
import{
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform
}from "react-native";
import { config } from "../config";

interface OrderItem {
  name: string;
  price: number;
  unit: string;
  type: string;
  quantity: number;
}
interface OrderDetails {
  _id: string;
  orderId: string;
  orderNumber: string;
  orderType: string;
  status: string;
  createdAt: string;
  collectorName: string;
  collectorPhone: string;
  address?: string;
  total: number;
  vendorId: {
    _id: string;
    fullName: string;
    uniID?: string;
    college?: {
      _id: string;
      fullName: string;
    };
  };
  items: OrderItem[];
}

const PaymentPage = () => {
  const searchParams = useLocalSearchParams();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const router = useRouter();
  
  // Extract orderId from searchParams if not available from destructuring
  const actualOrderId = orderId || searchParams.orderId as string || searchParams.orderid as string;
  
  console.log("🎉 Mobile Payment Page: Received orderId:", actualOrderId);
  console.log("🎉 Mobile Payment Page: All search params:", searchParams);
  console.log("🎉 Mobile Payment Page: Extracted orderId:", actualOrderId);
  console.log("🎉 Mobile Payment Page: orderId from destructuring:", orderId);
  console.log("🎉 Mobile Payment Page: orderId from searchParams:", searchParams.orderId);
  console.log("🎉 Mobile Payment Page: orderid from searchParams:", searchParams.orderid);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [vendorPreparationTime, setVendorPreparationTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navigationReady, setNavigationReady] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    console.log("🔄 Payment Page: Initializing navigation ready state");
    if (Platform.OS === 'web') {
      console.log("🌐 Web platform: Setting navigation ready to true");
      setNavigationReady(true);
    } else {
      // For mobile platforms, set ready after a short delay to ensure navigation is ready
      console.log("📱 Mobile platform: Setting navigation ready after delay");
      const timer = setTimeout(() => {
        console.log("📱 Mobile platform: Navigation ready set to true");
        setNavigationReady(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Get auth token
  const getAuthToken = async () => {
    try {
      return await getToken();
    } catch (error) {
      console.error("Error getting token from storage:", error);
      return null;
    }
  };

  // Configure axios with auth header
  const getAuthConfig = async () => {
    const token = await getAuthToken();
    console.log("🔐 Payment Page: Auth token retrieved:", token ? "YES" : "NO");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // Fetch order details
  useEffect(() => {
    console.log("🔄 Payment Page: useEffect triggered", { navigationReady, actualOrderId });
    
    if (!navigationReady) {
      console.log("⏳ Payment Page: Navigation not ready yet, waiting...");
      return;
    }
    
    const fetchOrderDetails = async (isRetry = false) => {
      console.log("🚀 Payment Page: Starting fetchOrderDetails", { actualOrderId, isRetry, retryCount });
      
      if (!actualOrderId || actualOrderId === 'undefined') {
        console.log("❌ Payment Page: No valid orderId provided");
        setLoading(false);
        return;
      }

      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.log("⏰ Payment Page: Loading timeout reached");
        setLoadingTimeout(true);
        setError("Request timed out. Please check your internet connection and try again.");
        setLoading(false);
      }, 10000); // 10 second timeout

      try {
        console.log("📡 Payment Page: Fetching order details for orderId:", actualOrderId);
        console.log("📡 Payment Page: Backend URL:", process.env.EXPO_PUBLIC_BACKEND_URL);
        
        // Fetch order details directly by orderId
        const authConfig = await getAuthConfig();
        console.log("🔐 Payment Page: Auth config:", authConfig);
        
        const orderResponse = await axios.get(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/order/${actualOrderId}`,
          authConfig
        );
        
        // Clear timeout if request succeeds
        clearTimeout(timeoutId);

        console.log("Order response:", orderResponse.data);
        console.log("Order response success:", orderResponse.data.success);
        console.log("Order response order:", orderResponse.data.order);

        if (orderResponse.data.success && orderResponse.data.order) {
          console.log("✅ Setting order details:", orderResponse.data.order);
          setOrderDetails(orderResponse.data.order);
          
          // Fetch vendor delivery settings to get preparation time
          try {
            const vendorId = orderResponse.data.order.vendorId._id;
            const deliverySettingsResponse = await axios.get(
              `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/vendor/${vendorId}/delivery-settings`
            );
            
            if (deliverySettingsResponse.data.success) {
              setVendorPreparationTime(deliverySettingsResponse.data.data.deliveryPreparationTime);
            }
          } catch (error) {
            console.error("Failed to fetch vendor preparation time:", error);
            // Set default preparation time if we can't fetch it
            setVendorPreparationTime(30);
          }
        } else {
          console.error("Order not found or invalid response");
          console.error("Response data:", orderResponse.data);
          
          // If order not found and we haven't retried too many times, retry after a delay
          if (retryCount < 3) {
            console.log(`🔄 Payment Page: Order not found, retrying in 2 seconds (attempt ${retryCount + 1}/3)`);
            setRetryCount(prev => prev + 1);
            setTimeout(() => {
              fetchOrderDetails(true);
            }, 2000);
            return;
          } else {
            setError("Order not found or invalid response. Please check your order ID.");
          }
        }
      } catch (error) {
        // Clear timeout if request fails
        clearTimeout(timeoutId);
        console.error("Error fetching order details:", error);
        if (axios.isAxiosError(error)) {
          console.error("Error response:", error.response?.data);
          setError(error.response?.data?.message || "Failed to fetch order details");
        } else {
          setError("Failed to fetch order details");
        }
      } finally {
        if (!isRetry) {
          setLoading(false);
        }
      }
    };

    fetchOrderDetails();
  }, [navigationReady, actualOrderId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.loadingScrollContent}>
        <View style={styles.loadingContent}>
          <Text style={styles.loading}>Loading order details...</Text>
          {retryCount > 0 && (
            <Text style={styles.retryText}>
              Retrying... (Attempt {retryCount}/3)
            </Text>
          )}
          <Text style={styles.loadingSubtext}>
            This may take a few moments after payment completion.
          </Text>
        </View>
        
        {/* Additional spacing to make screen scroll more */}
        <View style={styles.spacingContent}>
          <Text style={styles.spacingText}>Please wait while we process your order...</Text>
          <View style={styles.spacer} />
          <Text style={styles.spacingText}>Your order details will appear here once loaded.</Text>
          <View style={styles.spacer} />
          <Text style={styles.spacingText}>Thank you for your patience!</Text>
        </View>
      </ScrollView>
    );
  }

  if (!actualOrderId || actualOrderId === 'undefined') {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Invalid Order</Text>
        <Text style={styles.error}>No valid order ID provided. Please check your payment confirmation.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push("/")}>
          <Text style={styles.buttonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Error</Text>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push("/")}>
          <Text style={styles.buttonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.heading}>Payment Successful!</Text>
      <Text style={styles.message}>Thank you for your order.</Text>

      {orderDetails && (
        <View style={styles.orderDetails}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>
              <Text style={styles.bold}>Order ID:</Text> #{orderDetails.orderNumber}
            </Text>
            <Text style={styles.orderDate}>
              <Text style={styles.bold}>Order Date:</Text> {formatDate(orderDetails.createdAt)}
            </Text>
            <Text style={styles.orderType}>
              <Text style={styles.bold}>Order Type:</Text> {orderDetails.orderType.toUpperCase()}
            </Text>
            <Text style={styles.orderStatus}>
              <Text style={styles.bold}>Status:</Text> {orderDetails.status.toUpperCase()}
            </Text>
          </View>

          {orderDetails.vendorId && (
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorName}>
                <Text style={styles.bold}>Vendor:</Text> {orderDetails.vendorId.fullName || "Unknown Vendor"}
              </Text>
              {orderDetails.vendorId.college && (
                <Text style={styles.collegeName}>
                  <Text style={styles.bold}>College:</Text> {orderDetails.vendorId.college.fullName || "Unknown College"}
                </Text>
              )}
            </View>
          )}

          <View style={styles.collectorInfo}>
            <Text style={styles.sectionHeading}>Order Details</Text>
            <Text><Text style={styles.bold}>Name:</Text> {orderDetails.collectorName}</Text>
            <Text><Text style={styles.bold}>Phone:</Text> {orderDetails.collectorPhone}</Text>
            {orderDetails.address && (
              <Text><Text style={styles.bold}>Address:</Text> {orderDetails.address}</Text>
            )}
          </View>

          <View style={styles.itemsSection}>
            <Text style={styles.sectionHeading}>Items Ordered</Text>
            <View style={styles.itemsList}>
              {orderDetails.items.map((item: any, index: number) => (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDetails}>
                      ₹{item.price} per {item.unit} • {item.type}
                    </Text>
                  </View>
                  <Text style={styles.itemQuantity}>{item.quantity}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Estimated Preparation Time */}
          {vendorPreparationTime && (
            <View style={styles.preparationTime}>
              <Text style={styles.preparationTimeHeading}>⏱️ Estimated Preparation Time</Text>
              <Text style={styles.preparationTimeText}>
                Your order will be ready in approximately <Text style={styles.bold}>{vendorPreparationTime} minutes</Text>
              </Text>
            </View>
          )}

          <View style={styles.orderTotal}>
            <Text style={styles.totalAmount}>Total: ₹{orderDetails.total}</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={() => router.push('/')}>
            <Text style={styles.buttonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

export default PaymentPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 50,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingScrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 100,
    minHeight: 400,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4ea199',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
    marginBottom: 24,
  },
  loading: {
    fontSize: 18,
    textAlign: 'center',
    padding: 32,
    color: '#4ea199',
    fontWeight: '600',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  retryText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  loadingSubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
    marginTop: 16,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  homeButton: {
    backgroundColor: '#4ea199',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  homeButtonTop: {
    backgroundColor: '#4ea199',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 20,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  spacingContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  spacingText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#999',
    marginVertical: 10,
  },
  spacer: {
    height: 30,
  },
  error: {
    fontSize: 16,
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    textAlign: 'center',
  },
  orderDetails: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 3,
  },
  orderInfo: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
    paddingBottom: 12,
  },
  vendorInfo: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
    paddingBottom: 12,
  },
  collectorInfo: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
    paddingBottom: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  orderId: { color: '#1f2937', marginVertical: 4 },
  orderDate: { color: '#666', marginVertical: 4 },
  orderType: { color: '#666', marginVertical: 4 },
  orderStatus: { color: '#666', marginVertical: 4 },
  vendorName: { color: '#374151', marginVertical: 4 },
  collegeName: { color: '#374151', marginVertical: 4 },
  bold: { fontWeight: 'bold' },
  itemsSection: {
    marginBottom: 16,
  },
  itemsList: {
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
  },
  itemQuantity: {
    backgroundColor: '#4ea199',
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    minWidth: 24,
    textAlign: 'center',
  },
  preparationTime: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 8,
    alignItems: 'center',
  },
  preparationTimeHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  preparationTimeText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  orderTotal: {
    borderTopWidth: 2,
    borderTopColor: '#d1d5db',
    marginTop: 16,
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4ea199',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#4ea199',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
