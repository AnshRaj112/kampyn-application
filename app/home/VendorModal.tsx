import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Vendor {
  _id: string;
  name: string;
  price: number;
  quantity?: number;
  isAvailable?: string;
  inventoryValue?: {
    price: number;
    quantity?: number;
    isAvailable?: string;
    isSpecial?: string;
  };
}

interface VendorModalProps {
  visible: boolean;
  vendors: Vendor[];
  selectedVendor: Vendor | null;
  onVendorSelect: (vendor: Vendor) => void;
  onConfirm: () => void;
  onCancel: () => void;
  itemName: string;
}

const VendorModal = ({
  visible,
  vendors,
  selectedVendor,
  onVendorSelect,
  onConfirm,
  onCancel,
  itemName,
}: VendorModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Vendor</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subtitle}>Available vendors for {itemName}</Text>
          
          <ScrollView style={styles.vendorList} showsVerticalScrollIndicator={false}>
            {vendors.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No vendors available for this item</Text>
              </View>
            ) : (
              vendors.map((vendor) => (
                <TouchableOpacity
                  key={vendor._id}
                  style={[
                    styles.vendorItem,
                    selectedVendor?._id === vendor._id && styles.selectedVendor
                  ]}
                  // onPress={() => onVendorSelect(vendor)}
                  onPress={() => {
  console.log("Selected vendor ID:", vendor._id);
  onVendorSelect(vendor);
}}

                >
                  <View style={styles.vendorInfo}>
                    <Text style={styles.vendorName}>{vendor.name}</Text>
                    <Text style={styles.vendorPrice}>₹{vendor.inventoryValue?.price || vendor.price}</Text>
                  </View>
                  
                  {vendor.inventoryValue?.quantity !== undefined && (
                    <Text style={styles.quantityText}>
                      Available: {vendor.inventoryValue.quantity}
                    </Text>
                  )}
                  
                  {selectedVendor?._id === vendor._id && (
                    <Ionicons name="checkmark-circle" size={24} color="#4ea199" style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                !selectedVendor && styles.disabledButton
              ]}
              onPress={onConfirm}
              disabled={!selectedVendor}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  vendorList: {
    maxHeight: 300,
  },
  vendorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 5,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedVendor: {
    borderColor: '#4ea199',
    backgroundColor: '#f0fdfa',
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  vendorPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4ea199',
  },
  quantityText: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 10,
  },
  checkIcon: {
    marginLeft: 10,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#4ea199',
  },
  disabledButton: {
    backgroundColor: '#cbd5e1',
  },
  confirmButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default VendorModal; 