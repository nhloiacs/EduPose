import os

# ============================================================
# IMPORTANT
# Set BEFORE importing torch / BLAS / OpenMP libraries
# ============================================================

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import cv2
import numpy as np
import joblib
import torch

from ultralytics.nn.autobackend import AutoBackend


# ============================================================
# CONFIG
# ============================================================

MODEL_DIR = "app/ml_models"

POSE_MODEL_PATH = f"{MODEL_DIR}/yolo26s-pose.pt"

INPUT_SIZE = 320

# YOLO person detection confidence
CONF_THRESHOLD = 0.40

# Classifier confidence
CLASSIFIER_THRESHOLD = 0.40


# ============================================================
# PYTORCH CONFIG
# ============================================================

torch.set_num_threads(1)
torch.set_num_interop_threads(1)

torch.backends.mkldnn.enabled = False


# ============================================================
# LOAD AI MODELS
# ============================================================

print("[INFO] Loading AI Models in background...")


ensemble_model = joblib.load(f"{MODEL_DIR}/model-pipeline.pkl")

le = joblib.load(f"{MODEL_DIR}/label_encoder1.pkl")


# ============================================================
# YOLO26 POSE MODEL
#
# Do NOT use:
#
#     from ultralytics import YOLO
#     pose_model = YOLO(...)
#
# because YOLO.predict() is what was crashing on the Pi.
#
# AutoBackend was tested successfully with the real RTSP frame.
# ============================================================

pose_model = AutoBackend(
    POSE_MODEL_PATH,
    device="cpu",
    fuse=True,
    verbose=False,
)

pose_model.eval()


print("[INFO] AI Models loaded successfully.")


# ============================================================
# LABEL MAP
# ============================================================

LABEL_MAP = {
    "0": "focus",
    "1": "distracted",
    "2": "?",
    "3": "raise-hand",
}


# ============================================================
# FEATURE COLUMNS
# ============================================================

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


# ============================================================
# ANGLE CALCULATION
# ============================================================


def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    ba = a - b
    bc = c - b

    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)

    return np.degrees(
        np.arccos(
            np.clip(
                cosine,
                -1.0,
                1.0,
            )
        )
    )


# ============================================================
# FEATURE EXTRACTION
# ============================================================


def extract_angles(kp):

    def safe_angle(ia, ib, ic):
        a = kp[ia]
        b = kp[ib]
        c = kp[ic]

        if np.all(a == 0) or np.all(b == 0) or np.all(c == 0):
            return -1

        return calculate_angle(a, b, c)

    def safe_dist(ia, ib):
        a = kp[ia]
        b = kp[ib]

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


# ============================================================
# AI PROCESSOR
# ============================================================


class AIProcessor:
    @staticmethod
    def process_frame(frame):

        if frame is None:
            return []

        if not isinstance(frame, np.ndarray):
            return []

        if frame.size == 0:
            return []

        original_h, original_w = frame.shape[:2]

        if original_h <= 0 or original_w <= 0:
            return []

        # ====================================================
        # BGR -> RGB
        # ====================================================

        rgb = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2RGB,
        )

        # ====================================================
        # Resize
        # ====================================================

        resized = cv2.resize(
            rgb,
            (
                INPUT_SIZE,
                INPUT_SIZE,
            ),
            interpolation=cv2.INTER_LINEAR,
        )

        # ====================================================
        # HWC -> CHW
        # ====================================================

        tensor = torch.from_numpy(resized)

        tensor = tensor.permute(
            2,
            0,
            1,
        ).contiguous()

        # ====================================================
        # uint8 -> float32
        # ====================================================

        tensor = tensor.float() / 255.0

        # ====================================================
        # Add batch dimension
        # ====================================================

        tensor = tensor.unsqueeze(0)

        # ====================================================
        # YOLO INFERENCE
        # ====================================================

        try:
            with torch.no_grad():
                raw = pose_model(tensor)

        except Exception as e:
            print(
                "[ERROR] YOLO inference:",
                repr(e),
            )

            return []

        # ====================================================
        # Validate output
        # ====================================================

        if raw is None:
            return []

        if not isinstance(raw, (tuple, list)):
            print(
                "[ERROR] Unexpected YOLO output:",
                type(raw),
            )
            return []

        if len(raw) == 0:
            return []

        predictions = raw[0]

        if not torch.is_tensor(predictions):
            return []

        # ====================================================
        # [1,300,57] -> [300,57]
        # ====================================================

        if predictions.ndim == 3:
            pred = predictions[0]

        elif predictions.ndim == 2:
            pred = predictions

        else:
            print(
                "[ERROR] Unexpected prediction shape:",
                predictions.shape,
            )

            return []

        if pred.numel() == 0:
            return []

        if pred.shape[-1] != 57:
            print(
                "[ERROR] Unexpected YOLO26 pose output:",
                pred.shape,
            )

            return []

        # ====================================================
        # SPLIT
        # ====================================================

        boxes = pred[:, :4]

        confs = pred[:, 4]

        classes = pred[:, 5]

        keypoints = pred[:, 6:57].reshape(
            -1,
            17,
            3,
        )

        # ====================================================
        # CPU
        # ====================================================

        boxes = boxes.detach().cpu()

        confs = confs.detach().cpu()

        classes = classes.detach().cpu()

        keypoints = keypoints.detach().cpu()

        # ====================================================
        # SCALE TO ORIGINAL FRAME
        # ====================================================

        scale_x = original_w / INPUT_SIZE

        scale_y = original_h / INPUT_SIZE

        boxes = boxes.clone()

        boxes[:, [0, 2]] *= scale_x

        boxes[:, [1, 3]] *= scale_y

        keypoints = keypoints.clone()

        keypoints[:, :, 0] *= scale_x

        keypoints[:, :, 1] *= scale_y

        # ============================================================
        # BUILD DETECTIONS
        # ============================================================

        detections = []

        for i in range(len(pred)):
            # --------------------------------------------------------
            # YOLO confidence
            # --------------------------------------------------------

            yolo_confidence = float(confs[i].item())

            if not np.isfinite(yolo_confidence):
                continue

            if yolo_confidence < CONF_THRESHOLD:
                continue

            # --------------------------------------------------------
            # Class
            # --------------------------------------------------------

            class_id = int(classes[i].item())

            if class_id != 0:  # person only
                continue

            # ========================================================
            # BOUNDING BOX
            # ========================================================

            box = boxes[i]

            x1, y1, x2, y2 = map(
                int,
                box.tolist(),
            )

            # Clamp bbox
            x1 = max(
                0,
                min(x1, original_w - 1),
            )

            y1 = max(
                0,
                min(y1, original_h - 1),
            )

            x2 = max(
                0,
                min(x2, original_w - 1),
            )

            y2 = max(
                0,
                min(y2, original_h - 1),
            )

            # Invalid bbox
            if x2 <= x1 or y2 <= y1:
                continue

            # ========================================================
            # CENTER
            # ========================================================

            cx = int((x1 + x2) / 2)
            cy = int((y1 + y2) / 2)

            # ========================================================
            # DEFAULT RESULT
            #
            # Box tetap dibuat walaupun classifier gagal.
            # ========================================================

            final_label = "unknown"
            classification_confidence = 0.0

            # ========================================================
            # KEYPOINTS
            # ========================================================

            kp = keypoints[i].numpy().copy()

            if kp.shape == (17, 3):
                # Remove NaN / Inf
                invalid = ~np.isfinite(kp)
                kp[invalid] = 0.0

                # ----------------------------------------------------
                # Jangan zero-kan keypoint berdasarkan confidence
                # sebelum feature extraction.
                #
                # Kita tetap gunakan coordinate yang diberikan YOLO,
                # seperti perilaku kode original.
                # ----------------------------------------------------

                try:
                    features = extract_angles(kp)

                    # ------------------------------------------------
                    # Validate features
                    # ------------------------------------------------

                    valid_features = True

                    for col in feature_cols:
                        if col not in features:
                            valid_features = False
                            break

                        value = features[col]

                        if value is None:
                            valid_features = False
                            break

                        try:
                            value = float(value)
                        except (
                            TypeError,
                            ValueError,
                        ):
                            valid_features = False
                            break

                        if not np.isfinite(value):
                            valid_features = False
                            break

                        if value == -1:
                            valid_features = False
                            break

                    # ------------------------------------------------
                    # CLASSIFIER
                    # ------------------------------------------------

                    if valid_features:
                        input_data = np.array(
                            [[float(features[col]) for col in feature_cols]],
                            dtype=np.float32,
                        )

                        if np.all(np.isfinite(input_data)):
                            try:
                                proba = ensemble_model.predict_proba(input_data)[0]

                                if len(proba) > 0:
                                    max_idx = int(np.argmax(proba))

                                    classification_confidence = float(proba[max_idx])

                                    if (
                                        classification_confidence
                                        >= CLASSIFIER_THRESHOLD
                                    ):
                                        raw_label = str(le.classes_[max_idx])

                                        final_label = LABEL_MAP.get(
                                            raw_label,
                                            raw_label,
                                        )

                            except Exception as e:
                                print(
                                    "[WARN] Classifier error:",
                                    repr(e),
                                )

                except Exception as e:
                    print(
                        "[WARN] Feature extraction error:",
                        repr(e),
                    )

            # ========================================================
            # ALWAYS APPEND YOLO DETECTION
            # ========================================================

            detections.append(
                {
                    "label": final_label,
                    # YOLO person confidence
                    "confidence": round(
                        yolo_confidence,
                        3,
                    ),
                    # Classifier confidence
                    "classification_confidence": round(
                        classification_confidence,
                        3,
                    ),
                    "bbox": (
                        x1,
                        y1,
                        x2,
                        y2,
                    ),
                    "center": (
                        cx,
                        cy,
                    ),
                    "keypoints": (kp.tolist() if kp.shape == (17, 3) else []),
                }
            )

        return detections
