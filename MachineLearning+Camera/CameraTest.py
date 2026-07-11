import cv2
import numpy as np
import pandas as pd
import joblib
import time
import os
import json
import math
import xgboost as xgb # Wajib di-import biar joblib bisa baca model XGBoost di dalem VotingClassifier
from datetime import datetime
from ultralytics import YOLO

# ==========================================
# 0. SETUP DIRECTORY & PARAMETER
# ==========================================
SAVE_DIR = "./saved_frames"
os.makedirs(SAVE_DIR, exist_ok=True)

INTERVAL_DETIK = 5.0
DISTANCE_THRESHOLD = 150.0  # Toleransi radius pergerakan siswa (dalam piksel)

# Pindahkan mapping ke atas agar tidak dideklarasikan berulang kali di dalam loop
LABEL_MAP = {
    "0": "focus",
    "1": "distracted",
    "2": "?",
    "3": "raise-hand"
}

# ==========================================
# 1. LOAD MODEL & ENCODER
# ==========================================
print("[INFO] Loading models...")
ensemble_model = joblib.load("model-pipeline.pkl") 
le = joblib.load("label_encoder1.pkl")
pose_model = YOLO("yolo26s-pose.pt") 

feature_cols = [
    "neck_tilt", "head_spine_l", "head_spine_r", "spine_l", "spine_r", "shoulder_tilt",
    "left_elbow", "right_elbow", "left_shoulder_ang", "right_shoulder_ang",
    "nose_shoulder_y", "nose_hip_y", "ear_shoulder_y_l", "ear_shoulder_y_r",
    "wrist_shoulder_y_l", "wrist_shoulder_y_r", "elbow_shoulder_y_l", "elbow_shoulder_y_r",
    "nose_center_x", "ear_asymmetry_x", "eye_asymmetry_x", "nose_hip_x",
    "shoulder_hip_dist", "nose_shoulder_dist", "wrist_hip_l", "wrist_hip_r",
    "wrist_height_diff", "elbow_height_diff", "hip_y_abs", "knee_y_abs", "ankle_y_abs"
]

# ==========================================
# 2. FUNGSI EKSTRAKSI FITUR
# ==========================================
def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0)))

def extract_angles(kp):
    def safe_angle(ia, ib, ic):
        a, b, c = kp[ia], kp[ib], kp[ic]
        if np.all(a==0) or np.all(b==0) or np.all(c==0): return -1
        return calculate_angle(a, b, c)

    def safe_dist(ia, ib):
        a, b = kp[ia], kp[ib]
        if np.all(a==0) or np.all(b==0): return -1
        return float(np.linalg.norm(a - b))
    
    sh_w = safe_dist(5, 6)
    norm = sh_w if sh_w > 0 else 1.0

    def norm_y(ia, ib):
        if np.all(kp[ia]==0) or np.all(kp[ib]==0): return -1
        return float((kp[ia][1] - kp[ib][1]) / norm)

    def norm_x(ia, ib):
        if np.all(kp[ia]==0) or np.all(kp[ib]==0): return -1
        return float((kp[ia][0] - kp[ib][0]) / norm)

    return {
        "neck_tilt":           safe_angle(0,  5,  6),
        "head_spine_l":        safe_angle(0,  5,  11),
        "head_spine_r":        safe_angle(0,  6,  12),
        "spine_l":             safe_angle(5,  11, 13),
        "spine_r":             safe_angle(6,  12, 14),
        "shoulder_tilt":       safe_angle(11, 5,  6),
        "left_elbow":          safe_angle(5,  7,  9),
        "right_elbow":         safe_angle(6,  8,  10),
        "left_shoulder_ang":   safe_angle(11, 5,  7),
        "right_shoulder_ang":  safe_angle(12, 6,  8),
        "nose_shoulder_y":     norm_y(0,  5),
        "nose_hip_y":          norm_y(0,  11),
        "ear_shoulder_y_l":    norm_y(3,  5),
        "ear_shoulder_y_r":    norm_y(4,  6),
        "wrist_shoulder_y_l":  norm_y(9,  5),
        "wrist_shoulder_y_r":  norm_y(10, 6),
        "elbow_shoulder_y_l":  norm_y(7,  5),
        "elbow_shoulder_y_r":  norm_y(8,  6),
        "nose_center_x":       norm_x(0,  5),
        "ear_asymmetry_x":     norm_x(3,  4),
        "eye_asymmetry_x":     norm_x(1,  2),   
        "nose_hip_x":          norm_x(0,  11),  
        "shoulder_hip_dist":   safe_dist(5,  11),
        "nose_shoulder_dist":  safe_dist(0,  5),
        "wrist_hip_l":         safe_dist(9,  11),
        "wrist_hip_r":         safe_dist(10, 12),
        "wrist_height_diff":   norm_y(9,  10),
        "elbow_height_diff":   norm_y(7,  8),
        "hip_y_abs":           norm_y(11, 5),  
        "knee_y_abs":          norm_y(13, 5),   
        "ankle_y_abs":         norm_y(15, 5),   
    }

# ==========================================
# 3. FASE REGISTRASI (ABSENSI)
# ==========================================
student_name_input = input("\nMasukkan nama siswa yang diabsen: ")
registered_student = None

print(f"[INFO] Membuka kamera untuk absensi '{student_name_input}'.")
cap = cv2.VideoCapture(0)

while True:
    success, frame = cap.read()
    if not success:
        print("[ERROR] Gagal membaca frame kamera.")
        break
        
    cv2.putText(frame, f"Siswa: {student_name_input}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.putText(frame, "Tekan 'C' untuk Capture Absensi", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    
    cv2.imshow("Fase Absensi", frame)
    
    key = cv2.waitKey(1) & 0xFF
    if key == ord('c'):
        results = pose_model(frame, verbose=False)
        
        if results[0].boxes is not None and len(results[0].boxes.xyxy) > 0:
            box = results[0].boxes.xyxy[0].cpu().numpy()
            x1, y1, x2, y2 = box
            
            cx = int((x1 + x2) / 2)
            cy = int((y1 + y2) / 2)
            
            registered_student = {
                "name": student_name_input,
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "center_x": cx,
                "center_y": cy
            }
            
            print("\n==================================")
            print("Attendance Completed")
            print(f"Student Registered : {student_name_input}")
            print(f"Anchor Coordinate  : X={cx}, Y={cy}")
            print("==================================\n")
            break
        else:
            print("[WARNING] Tidak ada orang terdeteksi. Silakan atur posisi dan tekan 'C' lagi.")
            
    elif key == ord('q'):
        print("[INFO] Proses absensi dibatalkan.")
        cap.release()
        cv2.destroyAllWindows()
        exit()

cv2.destroyWindow("Fase Absensi")

# ==========================================
# 4. FASE MONITORING (INFERENSI)
# ==========================================
print("[INFO] Memasuki mode monitoring. Tekan 'Q' di window kamera untuk berhenti.")
last_process_time = time.time()

try:
    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break

        current_time = time.time()
        preview_frame = frame.copy()
        
        if current_time - last_process_time >= INTERVAL_DETIK:
            last_process_time = current_time
            
            results = pose_model(frame, verbose=False)
            db_payload = []

            if results[0].boxes is not None and results[0].keypoints is not None:
                boxes = results[0].boxes.xyxy.cpu().numpy()
                keypoints = results[0].keypoints.xy.cpu().numpy()
                
                if len(boxes) > 0 and len(keypoints) > 0:
                    min_dist = float('inf')
                    student_idx = -1
                    distances = []
                    
                    for i, box in enumerate(boxes):
                        x1, y1, x2, y2 = box
                        cx = int((x1 + x2) / 2)
                        cy = int((y1 + y2) / 2)
                        
                        dist = math.hypot(cx - registered_student["center_x"], cy - registered_student["center_y"])
                        distances.append((cx, cy, dist))
                        
                        if dist < min_dist:
                            min_dist = dist
                            student_idx = i
                    
                    for i, (box, kp) in enumerate(zip(boxes, keypoints)):
                        if len(kp) == 0: continue
                        
                        cx, cy, dist = distances[i]
                        
                        if i == student_idx and dist <= DISTANCE_THRESHOLD:
                            current_name = registered_student["name"]
                        else:
                            current_name = "Unknown"
                            
                        features = extract_angles(kp)
                        
                        if -1 not in features.values():
                            input_data = np.array([[features[col] for col in feature_cols]])
                            
                            # Eksekusi prediksi cukup SATU KALI
                            proba = ensemble_model.predict_proba(input_data)[0]
                            max_idx = np.argmax(proba)
                            confidence = proba[max_idx]
                            
                            # Mapping label
                            raw_label = str(le.classes_[max_idx])
                            final_label = LABEL_MAP.get(raw_label, raw_label)
                            
                            student_data = {
                                "student_name": str(current_name),
                                "label": final_label,
                                "confidence": float(round(confidence, 3)),
                                "pos_x": int(cx),
                                "pos_y": int(cy)
                            }
                            
                            db_payload.append(student_data)
                            
                            # --- VISUAL FRAME UPDATE ---
                            x1, y1, x2, y2 = map(int, box)
                            color = (0, 255, 0) if current_name != "Unknown" else (0, 0, 255)
                            text = f"{current_name} | {final_label} ({confidence*100:.1f}%)"
                            
                            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                            cv2.putText(frame, text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                            cv2.circle(frame, (cx, cy), 5, (255, 0, 0), -1)

            if len(db_payload) > 0:
                timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                image_path = os.path.join(SAVE_DIR, f"frame_{timestamp_str}.jpg")
                
                cv2.imwrite(image_path, frame)
                
                final_output = {
                    "timestamp": timestamp_str,
                    "image_saved_at": image_path,
                    "total_students": len(db_payload),
                    "detections": db_payload
                }
                
                print(json.dumps(final_output, indent=2))
                preview_frame = frame.copy()

        cv2.imshow("Monitoring Mode", preview_frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("\n[INFO] Simulasi dihentikan manual (Tombol Q).")
            break

except KeyboardInterrupt:
    print("\n[INFO] Simulasi dihentikan paksa (Ctrl+C).")

finally:
    cap.release()
    cv2.destroyAllWindows()
    print("[INFO] Kamera dilepas. Service mati.")
