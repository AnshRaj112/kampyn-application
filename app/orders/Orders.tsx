
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import ActiveOrdersPageContent from '@/app/activeorders';
import PastOrdersPageContent from '@/app/pastorders';

const OrdersScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ongoing' | 'history'>('ongoing');

  return (
    <SafeAreaView style={styles.container}>
      <Toast />

      {/* Header */}
     <View style={styles.header}>
  <Text style={styles.title}>My Orders</Text>
</View>


      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ongoing' && styles.activeTab]}
          onPress={() => setActiveTab('ongoing')}
        >
          <Text style={[styles.tabText, activeTab === 'ongoing' && styles.activeTabText]}>Ongoing</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'ongoing' ? (
          <ActiveOrdersPageContent />
        ) : (
          <PastOrdersPageContent />
        )}
      </View>
    </SafeAreaView>
  );
};

export default OrdersScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  header: {
    paddingTop: 32, // Top spacing
  paddingBottom: 12,
  alignItems: 'center', // horizontal center
  justifyContent: 'center',
   
  },

  title: {
    // fontSize: 18,
    // fontWeight: 'bold',
    // color: '#111827',
    // alignItems:'center',
    // justifyContent:'center'
     fontSize: 40,
  fontWeight: 'bold',
  //color: '#111827',
   textShadowColor: "rgba(78, 161, 153, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    color: "#4ea199",

  },

  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 20,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  activeTab: {
    borderBottomColor: '#10b981', 
  },

  tabText: {
    fontWeight: '600',
    color: '#6B7280', 
  },

  activeTabText: {
    color: '#10b981', 
  },

  tabContent: {
    flex: 1,
    marginTop: 10,
  },
});
