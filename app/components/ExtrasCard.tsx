import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { FoodItem } from "../../types/types";
import { Minus, Plus } from "lucide-react-native";

interface Props {
  item: FoodItem;
  onAdd: (item: FoodItem) => void;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  quantity: number;
}

const ExtrasCard: React.FC<Props> = ({ item, onAdd, onIncrease, onDecrease, quantity }) => (
  <View style={styles.card}>
    <Image
      source={{ uri: item.image || "https://via.placeholder.com/150" }}
      style={styles.image}
    />
    <Text style={styles.title}>{item.name}</Text>
    <Text style={styles.price}>₹{item.price}</Text>

    {quantity === 0 ? (
      <TouchableOpacity
        style={styles.addToCartButton}
        onPress={() => onAdd(item)}
      >
        <Text style={styles.buttonText}>Add to Cart</Text>
      </TouchableOpacity>
    ) : (
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onDecrease(item._id)}
        >
          <Minus size={16} color="#333" />
        </TouchableOpacity>

        <Text style={styles.quantity}>{quantity}</Text>

        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onIncrease(item._id)}
        >
          <Plus size={16} color="#333" />
        </TouchableOpacity>
      </View>
    )}
  </View>
);

export default ExtrasCard;
const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: "#e0f5f3",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    padding: 12,
    alignItems: "center",
    margin: 8,
    ...(Platform.OS === 'web' ? { zIndex: 0, position: 'relative', boxShadow: 'none' } : {}),
  },
  image: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: "cover",
  },
  title: {
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
    color: "#01796f",
    marginVertical: 4,
  },
  price: {
    fontSize: 13,
    color: "#444",
    marginBottom: 8,
  },
  addToCartButton: {
    backgroundColor: "#4ea199",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 13,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7fafc",
    padding: 8,
    borderRadius: 6,
  },
  quantityButton: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: {
    fontWeight: "600",
    color: "#2d3748",
    marginHorizontal: 10,
    textAlign: "center",
  },
});
