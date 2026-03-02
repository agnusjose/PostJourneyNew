import numpy as np

def calculate_angle(a, b, c):
    """
    Calculates the angle between three points (a, b, c) in 2D or 3D.
    b is the vertex.
    """
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    # Vectorize
    v1 = a - b
    v2 = c - b

    # Normalize vectors
    v1_u = v1 / np.linalg.norm(v1)
    v2_u = v2 / np.linalg.norm(v2)

    # Compute cosine of the angle
    cosine_angle = np.dot(v1_u, v2_u)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))

    return np.degrees(angle)

def calculate_trunk_lean(shoulder_mid, hip_mid):
    """
    Calculates the lean of the trunk relative to the vertical axis.
    """
    shoulder_mid = np.array(shoulder_mid)
    hip_mid = np.array(hip_mid)
    
    # Vector from hip to shoulder
    trunk_vec = shoulder_mid - hip_mid
    
    # Vertical vector (assuming y increases downwards in image coordinates)
    vertical_vec = np.array([0, -1]) if trunk_vec.ndim == 2 else np.array([0, -1, 0])
    
    # Normalization and angle
    v1_u = trunk_vec / np.linalg.norm(trunk_vec)
    cosine_angle = np.dot(v1_u, vertical_vec)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    
    return np.degrees(angle)

def get_joint_metrics(landmarks):
    """
    Extracts high-level clinical metrics from MediaPipe landmarks.
    landmarks: list of dicts {x, y, z, visibility}
    """
    if not landmarks or len(landmarks) < 33:
        return {}

    def get_pt(idx, dim=3):
        lm = landmarks[idx]
        if dim == 2:
            return [lm['x'], lm['y']]
        return [lm['x'], lm['y'], lm['z']]

    metrics = {}

    # --- Lower Body ---
    # Left Knee: Hip(23), Knee(25), Ankle(27)
    metrics['left_knee_angle'] = calculate_angle(get_pt(23), get_pt(25), get_pt(27))
    # Right Knee: Hip(24), Knee(26), Ankle(28)
    metrics['right_knee_angle'] = calculate_angle(get_pt(24), get_pt(26), get_pt(28))
    
    # Left Hip Flexion: Shoulder(11), Hip(23), Knee(25)
    metrics['left_hip_angle'] = calculate_angle(get_pt(11), get_pt(23), get_pt(25))
    # Right Hip Flexion: Shoulder(12), Hip(24), Knee(26)
    metrics['right_hip_angle'] = calculate_angle(get_pt(12), get_pt(24), get_pt(26))

    # --- Upper Body ---
    # Left Elbow: Shoulder(11), Elbow(13), Wrist(15)
    metrics['left_elbow_angle'] = calculate_angle(get_pt(11), get_pt(13), get_pt(15))
    # Right Elbow: Shoulder(12), Elbow(14), Wrist(16)
    metrics['right_elbow_angle'] = calculate_angle(get_pt(12), get_pt(14), get_pt(16))

    # --- Trunk ---
    shoulder_mid = (np.array(get_pt(11)) + np.array(get_pt(12))) / 2
    hip_mid = (np.array(get_pt(23)) + np.array(get_pt(24))) / 2
    metrics['trunk_lean_angle'] = calculate_trunk_lean(shoulder_mid, hip_mid)

    return metrics
