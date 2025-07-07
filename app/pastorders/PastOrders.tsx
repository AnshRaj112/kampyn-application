import { useRouter, useLocalSearchParams, usePathname } from "expo-router";
import { getToken, removeToken } from "../../utils/storage";
import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { config } from "../config";
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // React Navigation hookimport {
 import{  View,
    LayoutRectangle,
    FlatList,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
   Modal,
   Platform,
   RefreshControl,
   ActivityIndicator
} from "react-native";
import { ChevronRight, ChevronDown, Plus, Minus } from "lucide-react-native";
import { CustomToast } from '../CustomToast';
import 'react-toastify/dist/ReactToastify.css';
import Toast from "react-native-toast-message";
import { useRootNavigationState } from 'expo-router';
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

interface College {
  _id: string;
  fullName: string;
  shortName: string;
}

interface User {
  _id: string;
  name: string;
}

const PastOrdersPageContent = () => {
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

  const [navigationReady, setNavigationReady] = useState(Platform.OS === 'web');
  const [refreshing, setRefreshing] = useState(false);

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

  // Move fetchUserDetails out of useEffect
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

  // Move fetchColleges out of useEffect
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

  useEffect(() => {
    fetchUserDetails();
  }, [navigationReady]);

  useEffect(() => {
    fetchColleges();
  }, [isAuthenticated]);

  // Fetch user details
useEffect(() => {
  const fetchPastOrders = async () => {
    if (!user?._id) return;

    try {
      setLoading(true);
      const url = selectedCollege
        ? `${config.backendUrl}/order/past/${user._id}?collegeId=${selectedCollege._id}`
        : `${config.backendUrl}/order/past/${user._id}`;

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
          `${config.backendUrl}/api/user/auth/list`,
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
          ? `${config.backendUrl}/order/past/${user._id}?collegeId=${selectedCollege._id}`
          : `${config.backendUrl}/order/past/${user._id}`;

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
//   const pathname = usePathname();
//   useEffect(() => {
//   if (collegeId && colleges.length > 0) {
//     const college = colleges.find((c) => c._id === collegeId);
//     if (college) {
//       setSelectedCollege(college);
//     }
//   } else {
//     setSelectedCollege(null);
//     // Only replace if not already on the correct path
//     if (pathname !== '/pastorders/PastOrders') {
//       router.replace('/pastorders/PastOrders');
//     }
//   }
// }, [collegeId, colleges, pathname]);

useEffect(() => {
  if (collegeId && colleges.length > 0) {
    const college = colleges.find((c) => c._id === collegeId);
    if (college) {
      setSelectedCollege(college);
    }
  } else {
    setSelectedCollege(null);
  }
}, [collegeId, colleges]);


  // Close dropdown when clicking outside


//   const handleCollegeSelect = (college: College | null) => {
//   setSelectedCollege(college);
  
//   const newParams: Record<string, string> = {};
//   if (college) {
//     newParams.college = college._id;
//   }

//   // Update the route with new query params
//   router.replace({
//     pathname: "/login/LoginForm", // e.g. "/activeorders"
//     params: newParams,
//   });

//   setIsDropdownOpen(false);
// };

const handleCollegeSelect = (college: College | null) => {
  setSelectedCollege(college);
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
  
  const fetchPastOrders = async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const url = selectedCollege
        ? `${config.backendUrl}/order/past/${user._id}?collegeId=${selectedCollege._id}`
        : `${config.backendUrl}/order/past/${user._id}`;
      const response = await axios.get(url, await getAuthConfig());
      setPastOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching past orders:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push("/login/LoginForm");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPastOrders();
    setRefreshing(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      // Refetch all APIs when the page is focused
      fetchUserDetails();
      fetchColleges();
      fetchPastOrders();
    }, [selectedCollege, user?._id, isAuthenticated])
  );

return (
    <View style={styles.container}>
      <Toast />

      <Text style={styles.header}>Your Past Orders</Text>

      {/* Dropdown */}
      {/* <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsDropdownOpen(true)}
      >
        <Text>
          {selectedCollege ? selectedCollege.fullName : 'Select your college'}
        </Text>
        <ChevronDown size={20} />
      </TouchableOpacity> */}

      {/* <Modal visible={isDropdownOpen} transparent animationType="fade">
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
      </Modal> */}

      {/* College Header */}
      {/* <View style={styles.collegeHeader}>
        <Text style={styles.collegeName}>
          {selectedCollege ? selectedCollege.fullName : 'All Colleges'}
        </Text>
        <Text style={styles.subTitle}>Your Past Orders</Text>
      </View> */}

      {/* Conditional Rendering */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#4ea199" style={{ marginTop: 32 }} />
      ) : pastOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No past orders found</Text>
          <Text>You haven't placed any orders yet.</Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.push('/login/LoginForm')}
          >
            <Text style={styles.homeButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pastOrders}
          keyExtractor={(item) => item._id}
          renderItem={({ item: order }) => (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.imagePlaceholder} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.vendorName}>{order.vendorId?.fullName || 'Vendor'}</Text>
                  <Text style={styles.price}>₹{order.total?.toFixed(2)}</Text>
                  <Text style={styles.meta}>
                    {formatDate(order.createdAt)} • {order.items.length} Item{order.items.length > 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={styles.orderId}>#{order.orderNumber?.slice(-6)}</Text>
              </View>

              <View style={styles.buttonRow}>
                <Text
                  style={[
                    styles.statusLabel,
                    {
                      color: order.status === 'Cancelled' ? 'red' : '#10b981',
                    },
                  ]}
                >
                  {order.status}
                </Text>

                {/* <View style={styles.actions}>
                  <TouchableOpacity style={styles.rateButton}>
                    <Text style={styles.rateText}>Rate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reorderButton}>
                    <Text style={styles.reorderText}>Re-Order</Text>
                  </TouchableOpacity>
                </View> */}
              </View>
            </View>
          )}
          contentContainerStyle={styles.orderGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4ea199']} />
          }
        />
      )}
    </View>
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
    fontSize: 18,
   // fontWeight: 'bold',
   // textAlign: 'center',
    marginBottom: 24,
    color: '#4ea199',
    fontWeight: '600',
    
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  orderId: {
    fontSize: 12,
    color: '#9ca3af',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  rateButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 6,
  },
  rateText: {
    color: '#10b981',
    fontWeight: '600',
  },
  reorderButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#0f766e',
    borderRadius: 6,
  },
  reorderText: {
    color: '#fff',
    fontWeight: '600',
  },
});
