import cv2
import numpy as np
import joblib
import math
from ultralytics import YOLO

MODEL_DIR = "app/ml_models"
print("[INFO] Loading AI Models in background...")
ensemble_model = joblib.load(f"{MODEL_DIR}/model-pipeline.pkl")
le = joblib.load(f"{MODEL_DIR}/label_encoder1.pkl")
pose_model = YOLO(f"{MODEL_DIR}/yolo26s-pose.pt")
LABEL_MAP = {"0": "focus", "1": "distracted", "2": "?", "3": "raise-hand"}
feature_cols = [
    "neck_tilt",
    "head_spine_l",
    "head_spine_r",
    "spine_l",
    "spine_r",
    "shoulder_tilt",
    "left_elbow",
    "right_elbow",
    "left_shoulder_ang",
    "right_shoulder_ang",
    "nose_shoulder_y",
    "nose_hip_y",
    "ear_shoulder_y_l",
    "ear_shoulder_y_r",
    "wrist_shoulder_y_l",
    "wrist_shoulder_y_r",
    "elbow_shoulder_y_l",
    "elbow_shoulder_y_r",
    "nose_center_x",
    "ear_asymmetry_x",
    "eye_asymmetry_x",
    "nose_hip_x",
    "shoulder_hip_dist",
    "nose_shoulder_dist",
    "wrist_hip_l",
    "wrist_hip_r",
    "wrist_height_diff",
    "elbow_height_diff",
    "hip_y_abs",
    "knee_y_abs",
    "ankle_y_abs",
]


def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0)))


def extract_angles(kp):
    def safe_angle(ia, ib, ic):
        a, b, c = kp[ia], kp[ib], kp[ic]
        if np.all(a == 0) or np.all(b == 0) or np.all(c == 0):
            return -1
        return calculate_angle(a, b, c)

    def safe_dist(ia, ib):
        a, b = kp[ia], kp[ib]
        if np.all(a == 0) or np.all(b == 0):
            return -1
        return float(np.linalg.norm(a - b))

    sh_w = safe_dist(5, 6)
    norm = sh_w if sh_w > 0 else 1.0

    def norm_y(ia, ib):
        if np.all(kp[ia] == 0) or np.all(kp[ib] == 0):
            return -1
        return float((kp[ia][1] - kp[ib][1]) / norm)

    def norm_x(ia, ib):
        if np.all(kp[ia] == 0) or np.all(kp[ib] == 0):
            return -1
        return float((kp[ia][0] - kp[ib][0]) / norm)

    return {
        "neck_tilt": safe_angle(0, 5, 6),
        "head_spine_l": safe_angle(0, 5, 11),
        "head_spine_r": safe_angle(0, 6, 12),
        "spine_l": safe_angle(5, 11, 13),
        "spine_r": safe_angle(6, 12, 14),
        "shoulder_tilt": safe_angle(11, 5, 6),
        "left_elbow": safe_angle(5, 7, 9),
        "right_elbow": safe_angle(6, 8, 10),
        "left_shoulder_ang": safe_angle(11, 5, 7),
        "right_shoulder_ang": safe_angle(12, 6, 8),
        "nose_shoulder_y": norm_y(0, 5),
        "nose_hip_y": norm_y(0, 11),
        "ear_shoulder_y_l": norm_y(3, 5),
        "ear_shoulder_y_r": norm_y(4, 6),
        "wrist_shoulder_y_l": norm_y(9, 5),
        "wrist_shoulder_y_r": norm_y(10, 6),
        "elbow_shoulder_y_l": norm_y(7, 5),
        "elbow_shoulder_y_r": norm_y(8, 6),
        "nose_center_x": norm_x(0, 5),
        "ear_asymmetry_x": norm_x(3, 4),
        "eye_asymmetry_x": norm_x(1, 2),
        "nose_hip_x": norm_x(0, 11),
        "shoulder_hip_dist": safe_dist(5, 11),
        "nose_shoulder_dist": safe_dist(0, 5),
        "wrist_hip_l": safe_dist(9, 11),
        "wrist_hip_r": safe_dist(10, 12),
        "wrist_height_diff": norm_y(9, 10),
        "elbow_height_diff": norm_y(7, 8),
        "hip_y_abs": norm_y(11, 5),
        "knee_y_abs": norm_y(13, 5),
        "ankle_y_abs": norm_y(15, 5),
    }


class AIProcessor:
    @staticmethod
    def process_frame(frame):
        results = pose_model(frame, verbose=False)
        detections = []
        if results[0].boxes is not None and results[0].keypoints is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            keypoints = results[0].keypoints.xy.cpu().numpy()
            for i, (box, kp) in enumerate(zip(boxes, keypoints)):
                if len(kp) == 0:
                    continue
                x1, y1, x2, y2 = map(int, box)
                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)
                features = extract_angles(kp)
                if -1 not in features.values():
                    input_data = np.array([[features[col] for col in feature_cols]])
                    proba = ensemble_model.predict_proba(input_data)[0]
                    max_idx = np.argmax(proba)
                    confidence = proba[max_idx]
                    if confidence < 0.40:
                        final_label = "unknown"
                    else:
                        raw_label = str(le.classes_[max_idx])
                        final_label = LABEL_MAP.get(raw_label, raw_label)
                    detections.append(
                        {
                            "label": final_label,
                            "confidence": float(round(confidence, 3)),
                            "bbox": (x1, y1, x2, y2),
                            "center": (cx, cy),
                        }
                    )
        return detections
