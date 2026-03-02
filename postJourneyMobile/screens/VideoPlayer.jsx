import React, { useEffect } from "react";
import { Linking, Alert } from "react-native";

export default function VideoPlayer({ route, navigation }) {
  const { url } = route.params;

  useEffect(() => {
    if (!url) {
      Alert.alert("Error", "Invalid video URL");
      navigation.goBack();
      return;
    }

    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Unable to open video")
    );

    navigation.goBack();
  }, []);

  return null;
}