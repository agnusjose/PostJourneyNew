import { Camera } from "expo-camera";

export const CAMERA_TYPE = Camera.Constants.Type.front;

export const CAMERA_PROPS = {
  ratio: "16:9",
  autoFocus: Camera.Constants.AutoFocus.on,
  whiteBalance: Camera.Constants.WhiteBalance.auto,
};
