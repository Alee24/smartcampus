# 📹 Camera Connectivity Troubleshooting

If the **Camera Monitoring** dashboard shows cameras as "Offline" while they are "Online" in the NVR/Hikvision tools, follow these steps.

## 1. Automatic Fixes (Implemented)
The system now automatically attempts the following when you click **"Test"**:
1.  **Forces TCP Transport**: Improves reliability over different subnets or WiFi.
2.  **Fallback to Substream (102)**: If the Main Stream (101) fails (often due to H.265 codec issues), the system automatically tries the Substream (usually H.264).

## 2. Common Causes & Solutions

### A. Incorrect Credentials
*   **Symptom**: "Failed to connect to camera stream" even if IP is correct.
*   **Fix**: Verify the **Username** and **Password** in the "Edit Camera" modal.
    *   *Note*: NVR software might use a different password than the individual cameras. Check if the IP `172.16.9.3` is the NVR or the Camera itself. If it's the NVR, you need the NVR credentials.

### B. Port Mismatch (554 vs 8000 vs 80)
*   **Symptom**: Connection timed out.
*   **Explanation**: 
    *   **Port 8000**: Used for Hikvision Management/SDK (seen in your NVR list).
    *   **Port 554**: Used for **RTSP Video Streaming** (Required by this app).
*   **Fix**: Ensure you are using **Port 554**. If the camera allows changing the RTSP port, ensure it matches.

### C. Network Routing
*   **Symptom**: Backend cannot ping the camera.
*   **Test**: Open Command Prompt on the Server PC (`172.16.5.106`) and run:
    ```powershell
    ping 172.16.9.3
    ```
    If Request Timed Out, the Server PC cannot reach the Camera Network. You may need to configure the Router/Switch or add a static route.

### D. H.265 Codec Issue
*   **Symptom**: "Connected to stream but failed to decode frame".
*   **Fix**: Log into the Camera Web Interface -> Video/Audio -> Change "Video Encoding" from **H.265** to **H.264**. 
    *   *Alternatively*: Rely on the new "Substream Fallback" which usually uses H.264.

## 3. Testing with VLC
To verify if the Camera is truly accessible via RTSP:
1.  Download **VLC Media Player**.
2.  Go to **Media > Open Network Stream**.
3.  Enter: `rtsp://admin:password@172.16.9.3:554/Streaming/Channels/101`
4.  If VLC fails, the issue is Network or Credentials. If VLC works, the issue is the App.
