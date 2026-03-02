// context/CartContext.js - FIXED VERSION
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Remove hasLoadedCart and isFirstLoad refs to avoid race conditions

  const BASE_URL = "http://172.16.230.150:5000";

  // Storage key with user ID
  const getCartStorageKey = () => {
    if (!user?.userId) return null;
    return `@medical_equipment_cart_${user.userId}`;
  };

  // Load cart from storage
  const loadUserCart = async () => {
    try {
      console.log("📥 loadUserCart called for user:", user?.userId);

      if (!user?.userId) {
        setCart([]);
        setInitialized(true);
        console.log("⏸️ No user, setting empty cart");
        return;
      }

      const storageKey = `@medical_equipment_cart_${user.userId}`;

      // Check if user-specific cart exists
      const storedCart = await AsyncStorage.getItem(storageKey);

      if (storedCart) {
        console.log("✅ Found user-specific cart data");
        const parsedCart = JSON.parse(storedCart);
        const cartWithSelection = parsedCart.map(item => ({
          ...item,
          selected: item.selected !== undefined ? item.selected : true
        }));
        setCart(cartWithSelection);
      } else {
        // Check for old global cart and migrate
        const oldGlobalCartKey = "@medical_equipment_cart";
        const oldCartData = await AsyncStorage.getItem(oldGlobalCartKey);

        if (oldCartData) {
          await AsyncStorage.setItem(storageKey, oldCartData);
          await AsyncStorage.removeItem(oldGlobalCartKey);

          const oldCart = JSON.parse(oldCartData);
          const cartWithSelection = oldCart.map(item => ({
            ...item,
            selected: item.selected !== undefined ? item.selected : true
          }));
          setCart(cartWithSelection);
        } else {
          setCart([]);
        }
      }
      setInitialized(true);
    } catch (error) {
      console.error("❌ Error loading cart:", error);
      setCart([]);
      setInitialized(true);
    }
  };

  // Load cart when user changes
  useEffect(() => {

    if (!user?.userId) {
      setCart([]);
      setInitialized(true);
      return;
    }

    // Load cart for new user
    loadUserCart();
  }, [user?.userId]);

  // Save cart to storage whenever it changes
  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (!user?.userId) {
      return;
    }

    const saveCart = async () => {
      try {
        const storageKey = `@medical_equipment_cart_${user.userId}`;
        console.log("💾 Saving cart for user:", user.userId, "Items:", cart.length);

        // Always save the cart (even if empty)
        await AsyncStorage.setItem(storageKey, JSON.stringify(cart));
        console.log("✅ Cart saved successfully");
      } catch (error) {
        console.error("❌ Error saving cart:", error);
      }
    };

    // Only save if cart has been loaded at least once
    saveCart();
  }, [cart, initialized, user?.userId]);

  // Add a function to manually reload cart (useful for debugging)
  const reloadCart = async () => {
    if (user?.userId) {
      console.log("🔄 Manually reloading cart...");
      await loadUserCart();
    }
  };

  // Check stock availability with price
  const checkStockAvailability = async (itemId, requestedQuantity) => {
    try {
      const response = await axios.get(`${BASE_URL}/equipment/${itemId}`);
      if (response.data.success) {
        const equipment = response.data.equipment;
        return {
          available: equipment.stock >= requestedQuantity,
          currentStock: equipment.stock,
          equipmentName: equipment.equipmentName,
          pricePerDay: equipment.pricePerDay,
          imageUrl: equipment.imageUrl,
          providerId: equipment.providerId,
          providerName: equipment.providerName
        };
      }
      return {
        available: false,
        currentStock: 0,
        equipmentName: '',
        pricePerDay: 0,
        imageUrl: '',
        providerId: null,
        providerName: ''
      };
    } catch (error) {
      console.error("Error checking stock:", error);
      return {
        available: false,
        currentStock: 0,
        equipmentName: '',
        pricePerDay: 0,
        imageUrl: '',
        providerId: null,
        providerName: ''
      };
    }
  };

  // Add to cart
  const addToCart = async (item) => {
    setLoading(true);
    try {
      if (!user?.userId) {
        throw new Error("Please login to add items to cart");
      }

      console.log("🛒 Adding to cart:", item.equipmentName);

      const stockCheck = await checkStockAvailability(item._id, item.quantity || 1);

      if (!stockCheck.available) {
        throw new Error(`Only ${stockCheck.currentStock} unit(s) of "${stockCheck.equipmentName}" available`);
      }

      setCart(prev => {
        const existingItem = prev.find(cartItem => cartItem._id === item._id);
        if (existingItem) {
          const totalRequested = (existingItem.quantity || 0) + (item.quantity || 1);
          if (totalRequested > stockCheck.currentStock) {
            return prev;
          }

          return prev.map(cartItem =>
            cartItem._id === item._id
              ? {
                ...cartItem,
                quantity: (cartItem.quantity || 1) + (item.quantity || 1),
                currentStock: stockCheck.currentStock,
                pricePerDay: stockCheck.pricePerDay || cartItem.pricePerDay,
                selected: true
              }
              : cartItem
          );
        } else {
          return [...prev, {
            ...item,
            _id: item._id,
            quantity: item.quantity || 1,
            currentStock: stockCheck.currentStock,
            pricePerDay: stockCheck.pricePerDay || item.pricePerDay,
            imageUrl: stockCheck.imageUrl || item.imageUrl,
            providerId: stockCheck.providerId || item.providerId,
            providerName: stockCheck.providerName || item.providerName,
            selected: true
          }];
        }
      });

      return { success: true, message: "Added to cart" };
    } catch (error) {
      console.error("Error adding to cart:", error);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Prepare item for immediate booking
  const prepareForImmediateBooking = async (equipmentId, quantity = 1) => {
    setLoading(true);
    try {

      const response = await axios.get(`${BASE_URL}/equipment/${equipmentId}`);
      if (!response.data.success || !response.data.equipment) {
        throw new Error("Equipment not found");
      }

      const equipment = response.data.equipment;


      if (equipment.stock < quantity) {
        throw new Error(`Only ${equipment.stock} unit(s) of "${equipment.equipmentName}" available`);
      }

      const bookingItem = {
        _id: equipment._id,
        equipmentName: equipment.equipmentName,
        description: equipment.description,
        pricePerDay: equipment.pricePerDay,
        imageUrl: equipment.imageUrl,
        providerId: equipment.providerId,
        providerName: equipment.providerName,
        category: equipment.category,
        quantity: quantity,
        currentStock: equipment.stock,
        selected: true
      };


      return {
        success: true,
        bookingItem: bookingItem
      };
    } catch (error) {
      console.error("❌ Error preparing for booking:", error);
      return {
        success: false,
        message: error.message || "Failed to prepare booking"
      };
    } finally {
      setLoading(false);
    }
  };

  // Remove from cart
  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  // Clear cart
  const clearCart = async () => {
    setCart([]);
    if (user?.userId) {
      const storageKey = `@medical_equipment_cart_${user.userId}`;
      await AsyncStorage.removeItem(storageKey);
    }
  };

  // Remove selected items after booking
  const removeSelectedItems = () => {
    setCart(prev => prev.filter(item => !item.selected));
  };

  // Update quantity
  const updateQuantity = async (id, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(id);
      return false;
    }

    const item = cart.find(item => item._id === id);
    if (!item) return false;

    const stockCheck = await checkStockAvailability(id, newQuantity);

    if (!stockCheck.available) {
      throw new Error(`Only ${stockCheck.currentStock} unit(s) available`);
    }

    setCart(prev =>
      prev.map(item =>
        item._id === id
          ? {
            ...item,
            quantity: newQuantity,
            currentStock: stockCheck.currentStock,
            pricePerDay: stockCheck.pricePerDay || item.pricePerDay
          }
          : item
      )
    );

    return true;
  };

  // Toggle item selection
  const toggleItemSelection = (id) => {
    setCart(prev =>
      prev.map(item =>
        item._id === id
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  // Select all items
  const selectAllItems = () => {
    setCart(prev =>
      prev.map(item => ({ ...item, selected: true }))
    );
  };

  // Deselect all items
  const deselectAllItems = () => {
    setCart(prev =>
      prev.map(item => ({ ...item, selected: false }))
    );
  };

  // Get selected items
  const getSelectedItems = () => {
    return cart.filter(item => item.selected);
  };

  // Get cart total (all items)
  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      const itemTotal = (item.pricePerDay || 0) * (item.quantity || 1);
      return sum + itemTotal;
    }, 0);
  };

  // Get selected total
  const getSelectedTotal = () => {
    return cart.reduce((sum, item) => {
      if (item.selected) {
        const itemTotal = (item.pricePerDay || 0) * (item.quantity || 1);
        return sum + itemTotal;
      }
      return sum;
    }, 0);
  };

  // Get cart count (all items)
  const getCartCount = () => {
    return cart.reduce((count, item) => count + (item.quantity || 1), 0);
  };

  // Get selected count
  const getSelectedCount = () => {
    return cart.reduce((count, item) => {
      if (item.selected) {
        return count + (item.quantity || 1);
      }
      return count;
    }, 0);
  };

  // Validate selected stock
  const validateSelectedStock = async () => {
    const selectedItems = getSelectedItems();
    const validationResults = [];

    for (const item of selectedItems) {
      const stockCheck = await checkStockAvailability(item._id, item.quantity || 1);
      validationResults.push({
        itemId: item._id,
        itemName: item.equipmentName,
        requested: item.quantity || 1,
        available: stockCheck.available,
        currentStock: stockCheck.currentStock,
        isOutOfStock: !stockCheck.available,
        pricePerDay: stockCheck.pricePerDay || item.pricePerDay
      });
    }

    return validationResults;
  };

  // Check if item is in cart
  const isItemInCart = (itemId) => {
    return cart.some(item => item._id === itemId);
  };

  // Get cart item quantity
  const getCartItemQuantity = (itemId) => {
    const item = cart.find(item => item._id === itemId);
    return item ? item.quantity : 0;
  };

  // Refresh cart with latest stock and prices
  const refreshCartStock = async () => {
    const updatedCart = await Promise.all(
      cart.map(async (item) => {
        const stockCheck = await checkStockAvailability(item._id, item.quantity || 1);
        return {
          ...item,
          currentStock: stockCheck.currentStock,
          pricePerDay: stockCheck.pricePerDay || item.pricePerDay,
          available: stockCheck.available
        };
      })
    );
    setCart(updatedCart);
    return updatedCart;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        initialized,
        addToCart,
        prepareForImmediateBooking,
        removeFromCart,
        clearCart,
        removeSelectedItems,
        updateQuantity,
        toggleItemSelection,
        selectAllItems,
        deselectAllItems,
        getSelectedItems,
        getCartTotal,
        getSelectedTotal,
        getCartCount,
        getSelectedCount,
        validateSelectedStock,
        checkStockAvailability,
        refreshCartStock,
        isItemInCart,
        getCartItemQuantity,
        reloadCart // Add this for debugging
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}