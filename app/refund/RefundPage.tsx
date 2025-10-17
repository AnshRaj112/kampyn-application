

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
          <Text style={styles.heading}>Refund & Cancellation Policy</Text>
          <Text style={styles.description}>
            At KAMPYN, we value transparency, accountability, and a smooth
            ordering experience. This policy clearly defines our stance on refunds,
            cancellations, and payment guidelines, ensuring fairness for users and
            food vendors across campus food courts.
          </Text>



          <HoverCard title="Refund Policy">
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
              All confirmed orders are <Text style={styles.bold}>non-refundable</Text>. Once an
              order is placed and payment is successfully processed (where
              applicable), no refund requests will be entertained.          </Text>
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
              Users are encouraged to double-check their order details—items,
              quantities, and food preferences—before making any payment.          </Text>
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
              Visiting food court outlets to request or argue for refunds is
              strictly against platform policy. Such conduct will be treated as a
              violation and may result in account suspension or permanent
              termination.          </Text>

          </HoverCard>

           <HoverCard title="Cancellation Policy">
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
             Orders cannot be canceled once placed, regardless of the order type
            or time.
            </Text>
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
             To ensure reliable order processing and reduce food waste,
            cancellations are not supported.
            </Text>
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
             Users placing multiple or excessive orders without following through
            on payment or pickup will face permanent suspension from the
            platform.         </Text>

          </HoverCard>


           <HoverCard title="Payment Policy">
             <Text style={styles.cardText}>
          To streamline the ordering process and support operational efficiency:
                      </Text>

           
             
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
             If your order consists solely of pre-packed items (such as bottled
            beverages, chips, or sealed snacks), you may opt for Pay Later and
            complete payment at the time of pickup.
            </Text>
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
            If your order includes any prepared or made-to-order items (such as
            meals, sandwiches, or custom dishes), advance payment is mandatory
            at the time of ordering.         
            </Text>
               <Text style={styles.bullet}>
             
             This distinction ensures that freshly prepared food is made only
          against confirmed and paid requests, preventing resource misuse and
          vendor losses.        
            </Text>
            

          </HoverCard>


            <HoverCard title="Platform Integrity">
             <Text style={styles.cardText}>
             KAMPYN operates on mutual trust between users and food court
          vendors. Any misuse of platform functionality—such as:
                      </Text>
                      
           
             
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
            Coercing vendors or staff,
            </Text>
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
          Falsifying refund claims,        
            </Text>
               <Text style={styles.bullet}>
                 <Text style={styles.bold}>• </Text>
             
            Repeatedly exploiting &quot;Pay Later&quot; for unpaid pickups,     
            </Text>
             <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
             Abusing support or system loopholes—            
             </Text>
  <Text style={styles.cardText}>
              ...will result in immediate investigation and appropriate penalties,
          including account bans without prior warning.
                      </Text>

            

          </HoverCard>

          <HoverCard title="Need Assistance?">
            <Text style={styles.cardText}>
             If you have any concerns or require clarification regarding your
          orders or payment obligations, feel free to contact us anytime via our{" "}
              <Text
                style={styles.link}
                onPress={() => router.push("/help/HelpPage")}
              >
                Contact Us
              </Text> page.
            </Text>
          </HoverCard>

          <View style={styles.footerBox}>
            <Text style={styles.footer}>
              Thank you for choosing KAMPYN — empowering campuses with smarter
          food experiences.
          <br />
          Your cooperation helps us serve you better, every day.
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

