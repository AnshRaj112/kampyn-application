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
} from "react-native";
import { ChevronRight, ChevronDown, Plus, Minus } from "lucide-react-native";
import axios from "axios";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CustomToast } from '../CustomToast';
import 'react-toastify/dist/ReactToastify.css';
import Toast from "react-native-toast-message";
import { getToken, removeToken } from "../../utils/storage";
import { config } from "../config";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from '@react-navigation/native';
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

    // Fetch user
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

    // Fetch active orders based on selected college
    useEffect(() => {
        const fetchActiveOrders = async () => {
            if (!user?._id) return;

            try {
                setLoading(true);
                const configAuth = await getAuthConfig();
                const url = selectedCollege
                    ? `${BACKEND_URL}/order/user-active/${user._id}?collegeId=${selectedCollege._id}`
                    : `${BACKEND_URL}/order/user-active/${user._id}`;

                const response = await axios.get(url, configAuth);
                console.log('Active orders response:', response.data);
                setActiveOrders(response.data.orders || []);
            } catch (error) {
                console.error('Error fetching active orders:', error);
                if (axios.isAxiosError(error) && error.response?.status === 401) {
                    router.push('/login/LoginForm'); // Use router from useRouter()
                }
            } finally {
                setLoading(false);
            }
        };

        fetchActiveOrders();
    }, [user?._id, selectedCollege]);


    // Handle URL query parameter on initial load
    useEffect(() => {
        const { college: collegeId } = searchParams; // useLocalSearchParams gives you an object

        if (collegeId && colleges.length > 0) {
            const college = colleges.find((c) => c._id === collegeId);
            if (college) {
                setSelectedCollege(college);
            }
        } else {
            setSelectedCollege(null);

            router.replace('/activeorders/ActiveOrders'); // or current route path
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
            case 'ontheway':
                return '#8b5cf6'; // purple
            default:
                return '#6b7280'; // gray
        }
    };


    return (
        <ScrollView style={styles.container}>
            <Toast />
            <Text style={styles.header}>Your Active Orders</Text>

            {/* Dropdown */}
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
                        style={{
                            transform: [{ rotate: isDropdownOpen ? '180deg' : '0deg' }],
                        }}
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
                        {colleges.map((college: any) => (
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
            </View>

            {/* Section Header */}
            <View style={styles.collegeHeader}>
                <Text style={styles.collegeName}>
                    {selectedCollege ? selectedCollege.fullName : 'All Colleges'}
                </Text>
                <Text style={styles.subTitle}>Your Active Orders</Text>
            </View>

            {/* Loader / Empty / List */}
            {loading ? (
                <Text style={styles.loadingText}>Loading...</Text>
            ) : activeOrders.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No active orders found</Text>
                    <p> You don't have any active orders at the moment.</p>


                    {/* <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate('/login/LoginForm')}
          >
            <Text style={styles.homeButtonText}>Go to Home</Text>
          </TouchableOpacity> */}

                    {<TouchableOpacity onPress={() => router.push('/login/LoginForm')
                    }>
                        <Text>Go to Login</Text>
                    </TouchableOpacity>}
                </View>
            ) : (
                <FlatList
                    data={activeOrders}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item: order }) => (
                        <View style={styles.orderCard}>
                            <View style={styles.orderHeader}>
                                <View>
                                    <Text style={styles.orderId}>
                                        Order #{formatOrderId(order.orderId)}
                                    </Text>
                                    <Text>{formatDate(order.createdAt)}</Text>
                                    {order.vendorId && (
                                        <View>
                                            <Text>
                                                <Text style={{ fontWeight: 'bold' }}>Vendor: </Text>
                                                {order.vendorId.fullName || 'Unknown Vendor'}
                                            </Text>
                                            {order.vendorId.college && (
                                                <Text>
                                                    <Text style={{ fontWeight: 'bold' }}>College: </Text>
                                                    {order.vendorId.college.fullName || 'Unknown College'}
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                </View>
                                <View>
                                    <Text
                                        style={[
                                            styles.orderStatus,
                                            { backgroundColor: getStatusColor(order.status) },
                                        ]}
                                    >
                                        {order.status}
                                    </Text>
                                    <Text style={styles.orderType}>{order.orderType}</Text>
                                </View>
                            </View>

                            <View style={styles.orderDetails}>
                                <Text style={styles.collectorName}>{order.collectorName}</Text>
                                <Text>{order.collectorPhone}</Text>
                                {order.address && <Text>{order.address}</Text>}

                                {order.items.map((item, idx) => (
                                    <View key={idx} style={styles.itemCard}>
                                        <View>
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            <Text style={styles.itemDetails}>
                                                ₹{item.price} per {item.unit} • {item.type}
                                            </Text>
                                        </View>
                                        <Text style={styles.itemQuantity}>{item.quantity}</Text>
                                    </View>
                                ))}

                                <Text style={styles.totalAmount}>Total: ₹{order.total}</Text>
                            </View>
                        </View>
                    )}
                />
            )}
        </ScrollView>
    );
};
export default ActiveOrdersPageContent;
const styles = StyleSheet.create({
    container: {
        minHeight: '100%',
        backgroundColor: '#f8fafc',
        padding: 16,
        marginTop: 32,
    },
    header: {
        //alignItems: 'center',
        marginBottom: 48,
        textAlign:'center'
    },
    headerText: {
        fontSize: 32,
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
        fontSize: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    contentSection: {
        width: '100%',
        maxWidth: 1200,
        alignSelf: 'center',
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
    orderGrid: {
        gap: 16,
    },
    orderCard: {
        backgroundColor: '#e5e7eb',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        elevation: 4,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    orderInfo: {
        flex: 1,
    },
    orderId: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    orderDate: {
        fontSize: 14,
        color: '#666',
    },
    orderStatus: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        textTransform: 'uppercase',
        overflow: 'hidden',
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
    },
    orderSource: {
        marginTop: 8,
    },
    loadingText: {
        textAlign: 'center',
        marginBottom: 48,
    },
    emptyTitle: {
        textAlign: 'center',
        fontSize: 17.6,
        marginTop: 48,
        color: '#6b7280',
    },
    emptyMessage: {

    },
    vendorName: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 4,
    },
    collegeTag: {
        fontSize: 14,
        color: '#374151',
    },
    orderDetails: {
        marginTop: 16,
    },
    collectorInfo: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    collectorName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    collectorPhone: {
        fontSize: 14,
        color: '#666',
    },
    address: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 4,
    },
    itemsList: {
        marginVertical: 16,
        maxHeight: 200,
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
    },
    itemCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    itemDetails: {
        fontSize: 13,
        color: '#666',
    },
    itemQuantity: {
        backgroundColor: '#4ea199',
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        minWidth: 24,
        textAlign: 'center',
    },
    orderTotal: {
        borderTopColor: '#d1d5db',
        borderTopWidth: 2,
        paddingTop: 16,
        marginTop: 16,
        alignItems: 'flex-end',
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: '700',
        color: '#4ea199',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 48,
    },
    emptyText: {
        fontSize: 18,
        color: '#6b7280',
        textAlign: 'center',
    },
    homeButton: {
        backgroundColor: '#4ea199',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        marginTop: 16,
    },
    homeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        textAlign: 'center',
    },
});



