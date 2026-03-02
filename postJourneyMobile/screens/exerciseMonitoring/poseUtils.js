export function isPoseDetected(pose) {
  return pose && pose.keypoints && pose.keypoints.length > 0;
}

export function getKeypoint(keypoints, name) {
  return keypoints.find(k => k.name === name);
}
