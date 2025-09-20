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
  
  console.log("🎉 Mobile Payment Page: Received orderId:", orderId);
  console.log("🎉 Mobile Payment Page: All search params:", searchParams);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [vendorPreparationTime, setVendorPreparationTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navigationReady, setNavigationReady] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      try {
        const navState = useRootNavigationState?.();
        if (navState?.key) setNavigationReady(true);
      } catch (e) {
        setNavigationReady(false);
      }
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
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // Fetch order details
  useEffect(() => {
    if (!navigationReady) return;
    const fetchOrderDetails = async () => {
      if (!orderId || orderId === 'undefined') {
        console.log("No valid orderId provided");
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching order details for orderId:", orderId);
        
        // Fetch order details directly by orderId
        const orderResponse = await axios.get(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/order/${orderId}`,
          await getAuthConfig()
        );

        console.log("Order response:", orderResponse.data);

        if (orderResponse.data.success && orderResponse.data.order) {
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
          setError("Order not found or invalid response");
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
        if (axios.isAxiosError(error)) {
          console.error("Error response:", error.response?.data);
          setError(error.response?.data?.message || "Failed to fetch order details");
        } else {
          setError("Failed to fetch order details");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [navigationReady, orderId]);

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
      <View style={styles.container}>
        <Text style={styles.loading}>Loading order details...</Text>
      </View>
    );
  }

  if (!orderId || orderId === 'undefined') {
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
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={() => router.push('/')}>
        <Text style={styles.buttonText}>Go to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default PaymentPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
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
    fontSize: 16,
    textAlign: 'center',
    padding: 32,
    color: '#666',
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
