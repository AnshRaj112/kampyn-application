import { useRouter, useLocalSearchParams } from "expo-router";
import { getToken, removeToken } from "../../utils/storage";
import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { config } from "../config";
import { useNavigation } from '@react-navigation/native'; // React Navigation hookimport {
 import{  View,
    LayoutRectangle,
    FlatList,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
   Modal
} from "react-native";
import { ChevronRight, ChevronDown, Plus, Minus } from "lucide-react-native";
import { CustomToast } from '../CustomToast';
import 'react-toastify/dist/ReactToastify.css';
import Toast from "react-native-toast-message";
const { college: collegeId } = useLocalSearchParams();

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:5001";


interface OrderItem {
  name: string;
  price: number;
  unit: string;
  type: string;
  quantity: number;
}

interface PastOrder {
  _id: string;
  orderId: string;
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

interface College {
  _id: string;
  fullName: string;
  shortName: string;
}

interface User {
  _id: string;
  name: string;
}

const PastOrdersPageContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [colleges, setColleges] = useState<College[]>([]);
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
      const [isAuthenticated, setIsAuthenticated] = useState(false);
      const [checkingAuth, setCheckingAuth] = useState(true);
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

  // Fetch user details
useEffect(() => {
        const fetchUserDetails = async () => {
            try {
                setCheckingAuth(true);
                const token = await getAuthToken();
                if (!token) {
                    setIsAuthenticated(false);
                    router.push("/login/LoginForm");
                    return;
                }
                const response = await axios.get(`${config.backendUrl}/api/user/auth/user`, {
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
        fetchUserDetails();
    }, []);

// Fetch colleges
    useEffect(() => {
        const fetchColleges = async () => {
            if (!isAuthenticated) return;
            try {
                const configAuth = await getAuthConfig();
                const response = await axios.get(`${config.backendUrl}/api/user/auth/list`, configAuth);
                setColleges(response.data);
            } catch (error) {
                console.error("Error fetching colleges:", error);
            }
        };
        fetchColleges();
    }, [isAuthenticated]);

  
 // Fetch user details
useEffect(() => {
  const fetchPastOrders = async () => {
    if (!user?._id) return;

    try {
      setLoading(true);
      const url = selectedCollege
        ? `${BACKEND_URL}/order/past/${user._id}?collegeId=${selectedCollege._id}`
        : `${BACKEND_URL}/order/past/${user._id}`;

      const response = await axios.get(url, await getAuthConfig());
      console.log('Past orders response:', response.data);
      setPastOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching past orders:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push("/login/LoginForm"); // Navigate to login screen
      }
    } finally {
      setLoading(false);
    }
  };

  fetchPastOrders();
}, [user?._id, selectedCollege]);


  // Fetch colleges list
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const response = await axios.get(
          `${BACKEND_URL}/api/user/auth/list`,
         await getAuthConfig()
        );
        setColleges(response.data);
      } catch (error) {
        console.error("Error fetching colleges:", error);
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          router.push("/login/LoginForm");
        }
      }
    };
    fetchColleges();
  }, [router]);


 // Fetch past orders based on selected college
  useEffect(() => {
    const fetchPastOrders = async () => {
      if (!user?._id) return;

      try {
        setLoading(true);
        const url = selectedCollege
          ? `${BACKEND_URL}/order/past/${user._id}?collegeId=${selectedCollege._id}`
          : `${BACKEND_URL}/order/past/${user._id}`;

        const response = await axios.get(url, await getAuthConfig());
        console.log('Past orders response:', response.data);
        setPastOrders(response.data.orders || []);
      } catch (error) {
        console.error("Error fetching past orders:", error);
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          router.push("/login/LoginForm");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPastOrders();
  }, [user?._id, selectedCollege, router]);
  // Handle URL query parameter on initial load
  useEffect(() => {
  if (collegeId && colleges.length > 0) {
    const college = colleges.find((c) => c._id === collegeId);
    if (college) {
      setSelectedCollege(college);
    }
  } else {
    setSelectedCollege(null);

    // Remove 'college' from URL by resetting route without it
    const params = new URLSearchParams();
    router.replace({ pathname: '/login/LoginForm',params: {},});
  }
}, [collegeId, colleges]);

  // Close dropdown when clicking outside


  const handleCollegeSelect = (college: College | null) => {
  setSelectedCollege(college);
  
  const newParams: Record<string, string> = {};
  if (college) {
    newParams.college = college._id;
  }

  // Update the route with new query params
  router.replace({
    pathname: "/login/LoginForm", // e.g. "/activeorders"
    params: newParams,
  });

  setIsDropdownOpen(false);
};
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
  
  const formatOrderId = (orderId: string) => {
    return orderId.slice(-8).toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return '#10b981'; // green
      case 'completed':
        return '#3b82f6'; // blue
      case 'inprogress':
        return '#f59e0b'; // yellow
      default:
        return '#6b7280'; // gray
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Toast />
      <Text style={styles.header}>Your Past Orders</Text>

      {/* Dropdown */}
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsDropdownOpen(true)}
      >
        <Text>
          {selectedCollege ? selectedCollege.fullName : 'Select your college'}
        </Text>
        <ChevronDown size={20} />
      </TouchableOpacity>

      <Modal visible={isDropdownOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setIsDropdownOpen(false)}
        >
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleCollegeSelect(null)}
            >
              <Text>All Colleges</Text>
              <ChevronRight size={16} />
            </TouchableOpacity>

            {colleges.map((college) => (
              <TouchableOpacity
                key={college._id}
                style={styles.dropdownItem}
                onPress={() => handleCollegeSelect(college)}
              >
                <Text>{college.fullName}</Text>
                <ChevronRight size={16} />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* College Header */}
      <View style={styles.collegeHeader}>
        <Text style={styles.collegeName}>
          {selectedCollege ? selectedCollege.fullName : 'All Colleges'}
        </Text>
        <Text style={styles.subTitle}>Your Past Orders</Text>
      </View>

      {/* Conditional Rendering */}
      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : pastOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No past orders found</Text>
          <Text>You haven't placed any orders yet.</Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() =>router.push('/login/LoginForm')}
          >
            <Text style={styles.homeButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pastOrders}
          keyExtractor={(item) => item._id}
          renderItem={({ item: order }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>Order #{formatOrderId(order.orderId)}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  {order.vendorId && (
                    <View style={styles.orderSource}>
                      <Text><Text style={styles.bold}>Vendor:</Text> {order.vendorId.fullName}</Text>
                      {order.vendorId.college && (
                        <Text><Text style={styles.bold}>College:</Text> {order.vendorId.college.fullName}</Text>
                      )}
                    </View>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.orderStatus, { backgroundColor: getStatusColor(order.status) }]}>
                    {order.status}
                  </Text>
                  <Text style={styles.orderType}>{order.orderType}</Text>
                </View>
              </View>

              <View style={styles.collectorInfo}>
                <Text style={styles.collectorName}>{order.collectorName}</Text>
                <Text>{order.collectorPhone}</Text>
                {order.address && <Text style={styles.address}>{order.address}</Text>}
              </View>

              <View style={styles.itemsList}>
                {order.items.map((item, index) => (
                  <View key={index} style={styles.itemCard}>
                    <View>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDetails}>
                        ₹{item.price} per {item.unit} • {item.type}
                      </Text>
                    </View>
                    <Text style={styles.itemQuantity}>{item.quantity}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.totalAmount}>Total: ₹{order.total}</Text>
            </View>
          )}
          contentContainerStyle={styles.orderGrid}
        />
      )}
    </ScrollView>
  );

};
export default PastOrdersPageContent;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#4ea199',
  },
  dropdownButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    elevation: 5,
  },
  dropdownItem: {
    padding: 16,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  collegeHeader: {
    marginBottom: 16,
  },
  collegeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4ea199',
  },
  subTitle: {
    fontSize: 16,
    color: '#6fc3bd',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 18,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  homeButton: {
    backgroundColor: '#4ea199',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  homeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  orderGrid: {
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontWeight: '600',
    fontSize: 16,
  },
  orderDate: {
    fontSize: 12,
    color: '#555',
  },
  orderStatus: {
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  orderType: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    borderRadius: 6,
    color: '#374151',
  },
  collectorInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  collectorName: {
    fontWeight: '600',
    fontSize: 16,
  },
  address: {
    fontStyle: 'italic',
    color: '#666',
    marginTop: 4,
  },
  itemsList: {
    marginTop: 8,
  },
  itemCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemName: {
    fontWeight: '600',
  },
  itemDetails: {
    color: '#666',
    fontSize: 12,
  },
  itemQuantity: {
    backgroundColor: '#4ea199',
    color: 'white',
    fontWeight: '600',
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  totalAmount: {
    textAlign: 'right',
    fontWeight: '700',
    fontSize: 18,
    color: '#4ea199',
    marginTop: 8,
  },
  orderSource: {
    marginTop: 8,
  },
  bold: {
    fontWeight: '600',
  },
});
