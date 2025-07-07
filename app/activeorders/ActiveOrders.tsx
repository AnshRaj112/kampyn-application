import React, { useRef, useState, useEffect } from "react";
import {
    View,
    LayoutRectangle,
    FlatList,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Pressable,
    Image,
    ActivityIndicator,
    findNodeHandle,
    UIManager,
    Platform,
    RefreshControl,
} from "react-native";
import { ChevronRight, ChevronDown, Plus, Minus } from "lucide-react-native";
import axios from "axios";
import { useRouter, useLocalSearchParams, usePathname } from "expo-router";
import { CustomToast } from '../CustomToast';
import 'react-toastify/dist/ReactToastify.css';
import Toast from "react-native-toast-message";
import { getToken, removeToken } from "../../utils/storage";
import { config } from "../config";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {  useNavigationContainerRef } from 'expo-router';
import { useRootNavigationState } from 'expo-router';


//onst [activeOrders, setActiveOrders] = useState<OrderType[]>([]);

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:5001";


interface OrderItem {
    name: string;
    price: number;
    unit: string;
    type: string;
    quantity: number;
}

interface ActiveOrder {
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

const ActiveOrdersPageContent: React.FC = () => {
    const router = useRouter();
    const searchParams = useLocalSearchParams();
    const pathname = usePathname();
    let navigationState: any;
    if (Platform.OS !== 'web') {
      try {
        navigationState = useRootNavigationState();
      } catch (e) {
        navigationState = undefined;
      }
    }
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
    const [colleges, setColleges] = useState<College[]>([]);
    const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [dropdownLayout, setDropdownLayout] = useState<LayoutRectangle | null>(null);
    const dropdownRef = useRef<View>(null);
    const [refreshing, setRefreshing] = useState(false);


const [canNavigate, setCanNavigate] = useState(false);

// Delay navigation until mounted
useEffect(() => {
  const timeout = setTimeout(() => setCanNavigate(true), 0);
  return () => clearTimeout(timeout);
}, []);

// useEffect(() => {
//   const fetchUserDetails = async () => {
//     if (!canNavigate) return;

//     try {
//       setCheckingAuth(true);
//       const token = await getToken();
//       if (!token) {
//         setIsAuthenticated(false);
//         router.push('/login/LoginForm'); // ✅ Safe to use now
//         return;
//       }

//       const response = await axios.get(`${config.backendUrl}/api/user/auth/user`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setUser(response.data);
//       setIsAuthenticated(true);
//     } catch (error) {
//       if (axios.isAxiosError(error) && error.response?.status === 403) {
//         await removeToken();
//         setIsAuthenticated(false);
//         router.push('/login/LoginForm');
//       }
//     } finally {
//       setCheckingAuth(false);
//     }
//   };

//   fetchUserDetails();
// }, [canNavigate]);




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

    // Move fetchUserDetails out of useEffect
    const fetchUserDetails = async () => {
        try {
            setCheckingAuth(true);
            const token = await getAuthToken();
            if (!token) {
                setIsAuthenticated(false);
                router.replace("/login/LoginForm");
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
                router.replace("/login/LoginForm");
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

    // Fetch active orders based on selected college
    const fetchActiveOrders = async () => {
        if (!user?._id) return;
        try {
            setLoading(true);
            const configAuth = await getAuthConfig();
            const url = selectedCollege
                ? `${config.backendUrl}/order/user-active/${user._id}?collegeId=${selectedCollege._id}`
                : `${config.backendUrl}/order/user-active/${user._id}`;
            const response = await axios.get(url, configAuth);
            setActiveOrders(response.data.orders || []);
        } catch (error) {
            console.error('Error fetching active orders:', error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                router.push('/login/LoginForm');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Handle URL query parameter on initial load
    useEffect(() => {
        const { college: collegeId } = searchParams;

        if (collegeId && colleges.length > 0) {
            const college = colleges.find((c) => c._id === collegeId);
            if (college) {
                setSelectedCollege(college);
            }
        } else {
            setSelectedCollege(null);
            // Removed router.replace to prevent infinite reload
        }
    }, [searchParams, colleges]);
    const handleTouchOutside = (event: any) => {
        if (!dropdownLayout) return;

        const { pageX, pageY } = event.nativeEvent;

        const { x, y, width, height } = dropdownLayout;
        const isInside =
            pageX >= x && pageX <= x + width && pageY >= y && pageY <= y + height;

        if (!isInside) {
            setIsDropdownOpen(false);
        }
    };

    const handleDropdownLayout = () => {
        if (dropdownRef.current) {
            const handle = findNodeHandle(dropdownRef.current);
            if (handle) {
                UIManager.measure(handle, (_x, _y, width, height, px, py) => {
                    setDropdownLayout({ x: px, y: py, width, height });
                });
            }
        }
    };

    const handleCollegeSelect = (college: College | null) => {
        setSelectedCollege(college);

        if (college) {
            router.replace({
                pathname: '/activeorders/ActiveOrders',
                params: { college: college._id },
            });
        } else {
            router.replace('/activeorders/ActiveOrders'); // without any query param
        }

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
            case 'ontheway':
                return '#8b5cf6'; // purple
            default:
                return '#6b7280'; // gray
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchActiveOrders();
    };

    useFocusEffect(
        React.useCallback(() => {
            // Refetch all APIs when the page is focused
            fetchUserDetails();
            fetchColleges();
            fetchActiveOrders();
        }, [selectedCollege, user?._id, isAuthenticated])
    );




return (
<View style={styles.container}>
      <Toast />
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#4ea199" style={{ marginTop: 32 }} />
      ) : activeOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No active orders found</Text>
          <Text>You don't have any active orders at the moment.</Text>
          <TouchableOpacity onPress={() => router.push('/login/LoginForm')}>
            <Text style={styles.homeButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={activeOrders}
          keyExtractor={(item) => item._id}
          renderItem={({ item: order }) => (
            <View style={styles.simpleOrderCard}>
              <View style={styles.simpleOrderHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.vendorNameText}>
                      {order.vendorId?.fullName || 'Unknown Vendor'}
                    </Text>
                    <Text style={styles.orderAmount}>₹{order.total?.toFixed(2)}</Text>
                    <Text style={styles.orderDateTime}>
                      {formatDate(order.createdAt)} • {order.items.length} Item{order.items.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.orderNumber}>#{order.orderNumber?.split('-').pop()}</Text>
                  <Text style={styles.statusDelivered}>{order.status?.toLowerCase()}</Text>
                                          <Text style={styles.orderType}>{order.orderType}</Text>

                </View>
              </View>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4ea199"]} />
          }
          ListHeaderComponent={
            <>
              {/* <Text style={styles.header}>Your Active Orders</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {selectedCollege ? selectedCollege.fullName : 'Select your college'}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    style={{ transform: [{ rotate: isDropdownOpen ? '180deg' : '0deg' }] }}
                    color="#333"
                  />
                </TouchableOpacity>
                {isDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => handleCollegeSelect(null)}
                    >
                      <Text>All Colleges</Text>
                    </TouchableOpacity>
                    {colleges.map((college) => (
                      <TouchableOpacity
                        key={college._id}
                        style={styles.dropdownItem}
                        onPress={() => handleCollegeSelect(college)}
                      >
                        <Text>{college.fullName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View> */}
              <View style={styles.collegeHeader}>
                {/* <Text style={styles.collegeName}>
                  {selectedCollege ? selectedCollege.fullName : 'All Colleges'}
                </Text> */}
                <Text style={styles.subTitle}>Your Active Orders</Text>
              </View>
            </>
          }
        />
      )}
    </View>
  );
};

export default ActiveOrdersPageContent;

const styles = StyleSheet.create({
  container: {
   flex: 1,
  backgroundColor: '#f8fafc',
  paddingHorizontal: 16,
  paddingTop: 16, 
  },
  header: {
    marginBottom: 48,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4ea199',
  },
  dropdownContainer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    marginBottom: 48,
    position: 'relative',
  },
  dropdownButton: {
    width: '100%',
    backgroundColor: '#e5e7eb',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  dropdownMenu: {
    backgroundColor: 'white',
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 12,
    elevation: 4,
    marginTop: 8,
    maxHeight: 250,
  },
  dropdownItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 16,
    borderBottomColor: '#f3f4f6',
    borderBottomWidth: 1,
  },
  collegeHeader: {
    marginBottom: 32,
  },
  collegeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ea199',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4ea199',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 48,
  },
  emptyTitle: {
    textAlign: 'center',
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 8,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4ea199',
    marginTop: 12,
  },
  simpleOrderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  simpleOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  vendorLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
  },
  vendorNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
    color: '#111827',
  },
  orderDateTime: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  orderNumber: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'right',
    marginBottom: 4,
  },
   orderType: {
        fontSize: 12,
        fontWeight: '600',
        backgroundColor: '#f3f4f6',
        color: '#374151',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        textTransform: 'uppercase',
        marginLeft: 8,
       // marginRight:6
       marginTop:6
    },
  statusDelivered: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
    textTransform: 'capitalize',
    textAlign: 'right',
  },
});