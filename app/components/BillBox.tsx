import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import axios from "axios";
import { CartItem, OrderType, OrderData } from "@/types/types";

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

  const itemTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const packaging =
    orderType !== "dinein"
      ? items
          .filter((i) => i.category === "Produce")
          .reduce((s, i) => s + 5 * i.quantity, 0)
      : 0;
  const delivery = orderType === "delivery" ? 50 : 0;
  const grandTotal = itemTotal + packaging + delivery;

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || (orderType === "delivery" && !address.trim())) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    const payload: OrderData = {
      orderType,
      collectorName: name,
      collectorPhone: phone,
      ...(orderType === "delivery" ? { address } : {}),
    };

    try {
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/order/${userId}`,
        payload,
        { withCredentials: true }
      );

      const { orderId, razorpayOptions } = response.data;

      RazorpayCheckout.open({
        ...razorpayOptions,
        description: "Complete your payment",
        prefill: { name, contact: phone },
        theme: { color: "#01796f" },
      })
        .then(async (rzRes: any) => {
          try {
            await axios.post(
              `${process.env.EXPO_PUBLIC_BACKEND_URL}/payment/verify`,
              {
                razorpay_order_id: rzRes.razorpay_order_id,
                razorpay_payment_id: rzRes.razorpay_payment_id,
                razorpay_signature: rzRes.razorpay_signature,
                orderId,
              },
              { withCredentials: true }
            );
            Alert.alert("Success", "Payment successful!");
            onOrder(orderId);
          } catch {
            Alert.alert("Error", "Payment verification failed.");
          }
        })
        .catch(async () => {
          try {
            // Cancel the order and release locks
            await axios.post(
              `${process.env.EXPO_PUBLIC_BACKEND_URL}/order/${orderId}/cancel`,
              {},
              { withCredentials: true }
            );
            
            Alert.alert("Cancelled", "Payment cancelled. You can try ordering again.");
          } catch (error) {
            console.error("Failed to cancel order:", error);
            Alert.alert("Cancelled", "Payment cancelled, but there was an issue. Please try again in a few minutes.");
          }
        });
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to place order.");
    }
  };

  return (
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
});

export default BillBox;
