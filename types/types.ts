// src/types/index.ts

// Base food item structure
export interface FoodItem {
  _id: string;
  name: string;
  price: number;
  image: string; // For React Native, used in <Image source={{ uri: image }} />
  kind?: string;
}

// Cart item with associated metadata
export interface CartItem extends FoodItem {
  _id: string; // cart item ID (can differ from FoodItem _id)
  userId: string;
  foodcourtId: string;

  itemId: {
    _id: string;
    name: string;
    price: number;
    image: string;
    kind: string;
  };

  quantity: number;
  kind: string;
  name: string;
  price: number;
  image: string;
  vendorName: string;
  vendorId: string;
  category: "Retail" | "Produce"; // Can be used for filters
  packable?: boolean;
}

// Types of order a user can place
export type OrderType = "takeaway" | "delivery" | "dinein";

// Order form data
export interface OrderData {
  orderType: OrderType;
  collectorName: string;
  collectorPhone: string;
  address?: string; // Optional: only used for delivery
}
