import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Minus, Plus, Trash } from "lucide-react-native";
import { CartItem } from "../../types/types";

interface Props {
  item: CartItem;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
  isLoading?: boolean;
}

const CartItemCard: React.FC<Props> = ({ item, onIncrease, onDecrease, onRemove, isLoading = false }) => (
  <View style={styles.card}>
    <View style={styles.left}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} />
      ) : (
        <View style={styles.placeholder} />
      )}
      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>₹{item.price}</Text>
      </View>
    </View>

    <View style={styles.controls}>
      <TouchableOpacity
        onPress={() => onDecrease(item._id)}
        disabled={item.quantity === 1 || isLoading}
        style={[styles.controlButton, item.quantity === 1 && styles.disabledButton]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#01796f" />
        ) : (
          <Minus size={16} color={item.quantity === 1 ? "#999" : "#01796f"} />
        )}
      </TouchableOpacity>

      <Text style={styles.quantity}>{item.quantity}</Text>

      <TouchableOpacity 
        onPress={() => onIncrease(item._id)} 
        style={styles.controlButton}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#01796f" />
        ) : (
          <Plus size={16} color="#01796f" />
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => onRemove(item._id)} 
        style={styles.controlButton}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#01796f" />
        ) : (
          <Trash size={16} color="#01796f" />
        )}
      </TouchableOpacity>
    </View>
  </View>
);

export default CartItemCard;
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#e0f5f3",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 2,
    flexWrap: "wrap",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 8,
    resizeMode: "cover",
  },
  placeholder: {
    width: 70,
    height: 70,
    backgroundColor: "#eee",
    borderRadius: 8,
  },
  details: {
    marginLeft: 12,
    flexShrink: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#01796f",
  },
  price: {
    fontSize: 14,
    color: "#444",
    marginTop: 4,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 12,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#01796f",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    borderColor: "#ccc",
    backgroundColor: "#f1f1f1",
  },
  quantity: {
    fontWeight: "600",
    fontSize: 16,
    minWidth: 24,
    textAlign: "center",
  },
});
