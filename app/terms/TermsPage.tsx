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
          <Text style={styles.heading}>Terms & Conditions</Text>
          <Text style={styles.description}>
           Welcome to KAMPYN. By accessing or using our platform, you agree to
        comply with the following terms and conditions. We encourage all users
        to read them thoroughly to ensure a smooth and fair experience for
        everyone.
          </Text>



          <HoverCard title="1. Account Registration & User Information">
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
             Users are required to provide accurate, complete, and truthful
            information during registration.          </Text>
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
              Once an account is created, users will not be able to change
            personal details such as name, contact number, or identity
            credentials. For corrections or support, please contact us via the
            Contact Us page. </Text>
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
             Misrepresentation of identity, including gender or personal details,
            is strictly prohibited and may result in account action.
                     </Text>

          </HoverCard>

           <HoverCard title="2. Ordering & Pickup Guidelines">
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
            Users must collect their food orders promptly at the designated
            pickup time to avoid service disruption.
            </Text>
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
               Placing excessive orders without timely pickup is not allowed.
            Repeated instances may lead to penalties, including suspension of
            account privileges.
            </Text>
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
              Once confirmed, orders cannot be canceled or refunded under any
            circumstances.        
             </Text>

          </HoverCard>


           <HoverCard title="3. Prohibited Conduct">
           

           
             
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
           Creating fake accounts or registering on behalf of another person is
            not allowed. Such actions will result in immediate termination of
            the involved accounts.
            </Text>
            <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
           Any form of fraud, including using multiple accounts to exploit
            system features or avoid limitations, will be dealt with strictly
            and may incur severe penalties.        
            </Text>
             
            

          </HoverCard>


               <HoverCard title="4. Violations & Consequences">
                <Text style={styles.bullet}>
               <Text style={styles.bold}>• </Text>
           Breach of any of these terms may lead to temporary suspension or
            permanent banning of the user from KAMPYN.      
            </Text>
             
            <Text style={styles.cardText}>
               <Text style={styles.bold}>• </Text>
              In case of any disputes, clarifications, or issues, users are
            encouraged to reach out through the{" "}
              <Text
                style={styles.link}
                onPress={() => router.push("/help/HelpPage")}
              >
                Contact Us
              </Text> page for resolution.
            </Text>
          </HoverCard>

          <View style={styles.footerBox}>
            <Text style={styles.footer}>
               By using KAMPYN, you acknowledge and agree to all of the above
          terms. We reserve the right to modify or update these terms at any
          time without prior notice. Continued use of the platform constitutes
          acceptance of the most recent terms.
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
           








