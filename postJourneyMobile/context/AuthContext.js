// context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext();

const USER_STORAGE_KEY = "@PostJourney_User";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved user on app start
  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log("✅ Restored session for:", userData.email);
      } else {
        console.log("📝 No stored session found");
      }
    } catch (error) {
      console.error("Error loading stored user:", error);
    } finally {
      setIsLoading(false);
    }
  };

// In AuthContext.js, update the login function
// In AuthContext.js - update login function
const login = async (userData) => {
  try {
    console.log("🔑 Login called with userData:", {
      userId: userData.userId,
      email: userData.email
    });
    
    // IMPORTANT: Clear cart from previous user BEFORE setting new user
    if (user?.userId && user.userId !== userData.userId) {
      const oldCartKey = `@medical_equipment_cart_${user.userId}`;
      try {
        await AsyncStorage.removeItem(oldCartKey);
        console.log("🧹 Cleared old user's cart:", oldCartKey);
      } catch (error) {
        console.log("⚠️ No old cart to clear or error clearing:", error);
      }
    }
    
    // Save to state
    setUser(userData);
    
    // Persist to storage
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        
    // Give a small delay for CartContext to detect the user change
    setTimeout(() => {
      console.log("🔄 User change should be detected by CartContext now");
    }, 100);
    
  } catch (error) {
    console.error("❌ Error saving user session:", error);
  }
};

const logout = async () => {
  try {
    // DO NOT clear cart on logout - preserve it for next login
    // The cart will persist in AsyncStorage
    
    // Clear state
    setUser(null);
    // Clear user session only (not cart)
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    console.log("✅ User logged out (cart preserved)");
  } catch (error) {
    console.error("Error clearing user session:", error);
  }
};

  const updateUser = async (updatedData) => {
    try {
      const newUserData = { ...user, ...updatedData };
      setUser(newUserData);
      // Update storage
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUserData));
    } catch (error) {
      console.error("Error updating user session:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};