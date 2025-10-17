import { router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from "react-native";
import React, { useState } from "react";

export default function AboutUs() {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrapper}>
        <Text style={styles.heading}>About Us</Text>
        <Text style={styles.description}>
          Welcome to KAMPYN — your trusted partner in redefining how food is ordered and managed 
          within college food courts. We are committed to streamlining the campus dining experience 
          by making food ordering more efficient for students, staff, and vendors alike.
        </Text>

        <HoverCard title="Our Mission">
          <Text style={styles.cardText}>
            At KAMPYN, our mission is to empower students and food court operators with a modern, 
          digital platform that simplifies food ordering and inventory management. We strive to save time, 
          reduce queues, and enhance satisfaction with a system that&apos;s built for speed, accuracy, and ease of use.
          </Text>
        </HoverCard>

        <HoverCard title="What We Offer">
          <Text style={styles.bullet}>
            <Text style={styles.bold}>• Smart Online Food Ordering</Text> –Helping students order their favorite meals quickly and skip the lines.
          </Text>
          <Text style={styles.bullet}>
            <Text style={styles.bold}>• Simplified Pickup Process</Text> – Reducing wait times with scheduled pickups and real-time updates.
          </Text>
          <Text style={styles.bullet}>
            <Text style={styles.bold}>• Robust Inventory Management</Text> –Assisting vendors with accurate tracking, restocking, and supply insights.
          </Text>
          <Text style={styles.bullet}>
            <Text style={styles.bold}>• Fair & Transparent Policies</Text> – Ensuring equitable usage and accountability for both users and service providers.
          </Text>
        </HoverCard>

        <HoverCard title="Need Assistance?">
          <Text style={styles.cardText}>
            If you have any questions, suggestions, or require support, please don&apos;t hesitate to reach out through our{" "}
            <Text
              style={styles.link}
              onPress={() => router.push("/help/HelpPage")}
            >
             Contact Us
            </Text> page. 
          Your feedback is essential to our continuous improvement.
          </Text>
        </HoverCard>

        <View style={styles.footerBox}>
          <Text style={styles.footer}>
              Thank you for choosing KAMPYN — where convenience meets campus cuisine.{"\n"}
        
           We're here to serve, support, and simplify your food experience.
        
          </Text>
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HoverCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[styles.card, isHovered && styles.cardHovered]}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  heading: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#4ea199",
    textShadowColor: "rgba(78, 161, 153, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
    maxWidth: 720,
  },
  card: {
    backgroundColor: "#f8fbfd",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    width: "100%",
    maxWidth: 720,
    borderColor: "rgba(78, 161, 153, 0.3)",
    borderWidth: 1,
    shadowColor: "#4ea199",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    transitionDuration: "200ms",
    transitionProperty: "all",
    transitionTimingFunction: "ease-in-out",
  },
  cardHovered: {
    shadowColor: "#4ea199",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    borderColor: "#4ea199",
    transform: [{ scale: 1.02 }],
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4ea199",
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    color: "#444",
    lineHeight: 24,
  },
  bullet: {
    fontSize: 16,
    color: "#444",
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 10,
  },
  bold: {
    fontWeight: "bold",
     color: "#4ea199",
  },
  link: {
    color: "#4ea199",
    
    fontWeight: "600",
  },
  footerBox: {
    backgroundColor: "rgba(223,234,247,0.3)",
    padding: 20,
    borderRadius: 12,
    marginTop: 30,
    maxWidth: 720,
  },
  footer: {
    fontSize: 16,
    fontStyle: "italic",
    textAlign: "center",
    color: "#333",
  },
   contentWrapper: {
    backgroundColor: "#f8fbfd", 
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 800,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
});
  
