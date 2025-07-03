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
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
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
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        // Step 1: Fetch logged-in user data
        const userResponse = await axios.get(
          `${config.backendUrl}/api/user/auth/user`,
          await getAuthConfig()
        );
        const userId = userResponse.data._id;

        // Step 2: Fetch all active orders for that user
        const orderResponse = await axios.get(
          `${config.backendUrl}/order/user-active/${userId}`,
          await getAuthConfig()
        );

        // Step 3: Find the specific order by ID
        const order = orderResponse.data.orders.find(
          (order: OrderDetails) => order._id === orderId
        );

        if (order) {
          setOrderDetails(order);
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [navigationReady]);

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
