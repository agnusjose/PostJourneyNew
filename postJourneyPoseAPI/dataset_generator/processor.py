import cv2
import mediapipe as mp
import json
import os
import argparse
import numpy as np
from utils.angle_utils import get_joint_metrics

# Initialize MediaPipe
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=2,  # Use highest quality for dataset generation
    enable_segmentation=True,
    min_detection_confidence=0.5
)

def process_video(video_path, output_json, metadata=None):
    """
    Processes a video file and extracts pose data into a labeled JSON format.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video {video_path}")
        return

    frames_data = []
    frame_idx = 0
    fps = cap.get(cv2.CAP_PROP_FPS)

    print(f"Processing: {video_path} ({int(cap.get(cv2.CAP_PROP_FRAME_COUNT))} frames)")

    while cap.isOpened():
        success, image = cap.read()
        if not success:
            break

        # Convert to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)

        frame_entry = {
            "frame_index": frame_idx,
            "timestamp": frame_idx / fps,
            "keypoints_2d": [],
            "keypoints_3d": [],
            "metrics": {}
        }

        if results.pose_landmarks:
            # 2D Normalised Landmarks
            for lm in results.pose_landmarks.landmark:
                frame_entry["keypoints_2d"].append({
                    "x": lm.x,
                    "y": lm.y,
                    "z": lm.z,
                    "visibility": lm.visibility
                })

            # 3D World Landmarks (meters)
            if results.pose_world_landmarks:
                for lm in results.pose_world_landmarks.landmark:
                    frame_entry["keypoints_3d"].append({
                        "x": lm.x, 
                        "y": lm.y,
                        "z": lm.z,
                        "visibility": lm.visibility
                    })

            # Calculate clinical angles
            frame_entry["metrics"] = get_joint_metrics(frame_entry["keypoints_2d"])

        frames_data.append(frame_entry)
        frame_idx += 1
        
        if frame_idx % 30 == 0:
            print(f"Processed {frame_idx} frames...")

    cap.release()

    # Final Output structure
    dataset_output = {
        "metadata": metadata or {},
        "exercise_results": frames_data
    }

    with open(output_json, 'w') as f:
        json.dump(dataset_output, f, indent=2)

    print(f"✅ Success! Saved to {output_json}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Pose Dataset from Video")
    parser.add_argument("--input", required=True, help="Path to input video file")
    parser.add_argument("--output", required=True, help="Path to output JSON file")
    parser.add_argument("--exercise", default="generic", help="Exercise name")
    parser.add_argument("--quality", default="correctform", choices=["correctform", "partiallycorrect", "incorrect_form"])
    
    args = parser.parse_args()

    metadata = {
        "exercisename": args.exercise,
        "formquality": args.quality,
        "source_video": os.path.basename(args.input)
    }

    process_video(args.input, args.output, metadata)
