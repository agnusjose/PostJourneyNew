import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

export default function TFSanityTest() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const tf = await import("@tensorflow/tfjs");

        // ✅ FORCE CPU BACKEND (Expo Go safe)
        await tf.setBackend("cpu");
        await tf.ready();

        console.log("✅ TF backend:", tf.getBackend());

        if (mounted) setReady(true);
      } catch (e) {
        console.error("❌ TF init error:", e);
        if (mounted) setError(e.message);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Initializing TensorFlow...</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.title}>TensorFlow Ready</Text>
      <Text>Backend: CPU</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
});
