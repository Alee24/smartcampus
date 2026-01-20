# 🚧 Gate Control & OCR Guide

## Overview
The Gate Control module allows security personnel to manage entry/exit via Manual Entry, QR Code (coming soon), or **License Plate Recognition (LPR)**.

## 🚗 License Plate Recognition (LPR) & Vehicle Intel
The system uses the device's camera to capture vehicle images and process them. All logs are viewable in the **Vehicle Intel** dashboard.

### How to use Gate Control:
1.  Navigate to the **Gate Control** tab.
2.  Click **"Scan Number Plate"** in the Quick Actions panel.
3.  Allow camera permissions if prompted.
4.  Align the vehicle's number plate within the guide box.
5.  Click the **Camera Button** to capture.
6.  The system will:
    *   Capture the image.
    *   Extract the License Plate text (OCR).
    *   Search the database for the vehicle.
    *   **Allow** if found, or **Register as Visitor** if new (flagged).
    *   Log the entry details + image.

### 🚨 Emergency Alarm
In case of a security breach:
1.  Click the simplified **"Trigger Alarm"** button.
2.  Confirm the prompt.
3.  The system will log the alert and notify connected security dashboards (Terminal Output for now).

### 📊 Vehicle Intel Dashboard
Navigate to the **Vehicle Intel** tab to view:
*   **Live Vehicle Logs**: Real-time list of all vehicles entering.
*   **Captured Images**: Click or hover to see the photo of the vehicle at entry.
*   **Status**: Quickly identify "Guest", "Allowed", or "Flagged" vehicles.

### OCR Configuration
Currently, the system uses a **Simulated OCR** for demonstration purposes. 
*   **Production**: To enable real Tesseract/EasyOCR, edit `backend/app/routers/gate_control.py` and install `easyocr`.

## 📸 Vehicle & Passenger Logging
Every scan creates a `VehicleLog` record containing:
*   **Timestamp**
*   **Gate ID**
*   **Vehicle ID**
*   **Image**: The captured photo is stored in `static/vehicle_logs/` and displayed in the frontend.
