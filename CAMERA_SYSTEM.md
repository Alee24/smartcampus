# 🎥 Camera Monitoring System Documentation

## Overview
AI-powered camera monitoring system with support for Hikvision and other major IP camera brands. Features real-time analytics, people counting, motion detection, and room occupancy tracking.

## Features

### ✅ Multi-Brand Support
- **Hikvision** (Primary) - Automatic RTSP URL generation
- **Dahua** - Second largest manufacturer
- **Axis Communications** - Premium cameras
- **Generic RTSP** - Any RTSP-compatible camera

### ✅ AI-Powered Analytics
- **People Counting** - Track number of people in each room
- **Motion Detection** - Detect activity levels
- **Face Detection** - Optional facial recognition
- **Object Detection** - Identify objects in frame
- **Occupancy Tracking** - Calculate room occupancy percentage

### ✅ Real-Time Monitoring
- Live camera status (online/offline/error)
- Connection testing
- Automatic health checks
- Alert generation for anomalies

## Database Structure

### Cameras Table
```sql
- id: UUID (Primary Key)
- camera_name: VARCHAR(200)
- camera_code: VARCHAR(50) UNIQUE
- ip_address: VARCHAR(50)
- port: INT (default: 554)
- username: VARCHAR(100)
- password: VARCHAR(255)
- camera_brand: VARCHAR(50) (hikvision, dahua, axis, generic)
- protocol: VARCHAR(20) (rtsp, http, onvif)
- rtsp_url: VARCHAR(500) (optional custom URL)
- classroom_id: UUID (FK to classrooms)
- location_description: TEXT
- status: VARCHAR(50) (online, offline, error, maintenance)
- is_active: BOOLEAN
- enable_people_counting: BOOLEAN
- enable_face_detection: BOOLEAN
- enable_motion_detection: BOOLEAN
- enable_object_detection: BOOLEAN
- last_seen: DATETIME
- last_error: TEXT
```

### Camera Analytics Table
```sql
- id: UUID (Primary Key)
- camera_id: UUID (FK to cameras)
- timestamp: DATETIME
- people_count: INT
- people_entering: INT
- people_exiting: INT
- occupancy_percentage: FLOAT
- motion_level: VARCHAR(20) (low, medium, high)
- activity_score: FLOAT (0-100)
- detected_objects: JSON
- class_session_id: UUID (FK to class_sessions)
- is_alert: BOOLEAN
- alert_type: VARCHAR(50)
- alert_message: TEXT
- snapshot_url: VARCHAR(500)
```

## API Endpoints

### Camera Management
- `GET /api/cameras/cameras` - List all cameras
- `POST /api/cameras/cameras` - Add new camera
- `PUT /api/cameras/cameras/{id}` - Update camera
- `DELETE /api/cameras/cameras/{id}` - Delete camera
- `POST /api/cameras/cameras/{id}/test` - Test camera connection

### Analytics
- `GET /api/cameras/cameras/{id}/analytics?hours=24` - Get camera analytics
- `GET /api/cameras/analytics/room/{classroom_id}` - Get room analytics
- `POST /api/cameras/analytics/generate` - Generate analytics (testing)

### System
- `GET /api/cameras/dashboard/stats` - Overall system statistics
- `GET /api/cameras/brands` - Supported camera brands

## Hikvision Integration

### RTSP URL Format
```
rtsp://username:password@ip:port/Streaming/Channels/101
```

- Channel 1, Main Stream (High Quality): `/Streaming/Channels/101`
- Channel 1, Sub Stream (Lower Quality): `/Streaming/Channels/102`

### Default Credentials
- **Username**: admin
- **Password**: (set during camera setup)
- **Port**: 554 (RTSP)

### Connection Testing
The system automatically:
1. Builds correct RTSP URL based on brand
2. Attempts to connect to camera
3. Captures a test frame
4. Updates camera status
5. Logs any errors

## Setup Guide

### 1. Add Camera
1. Navigate to **Cameras** tab
2. Click **Add Camera**
3. Fill in details:
   - **Camera Name**: Descriptive name (e.g., "Lecture Hall 1 - Front")
   - **Camera Code**: Unique identifier (e.g., "CAM-LH1-01")
   - **IP Address**: Camera's network IP
   - **Port**: Usually 554 for RTSP
   - **Username/Password**: Camera credentials
   - **Brand**: Select from dropdown
   - **Room**: Link to classroom (optional)
   - **AI Features**: Enable desired analytics

### 2. Test Connection
- Click **Test** button on camera card
- System will verify connectivity
- Status updates automatically

### 3. View Analytics
- Click **Analytics** button
- View historical data
- Check people count, occupancy, motion levels

## AI Analytics Generation

### Automatic Processing
The system can be configured to:
1. Pull RTSP stream at intervals
2. Process frames with OpenCV
3. Run AI models for detection
4. Store analytics in database
5. Generate alerts if needed

### Manual Testing
Use the `POST /api/cameras/analytics/generate` endpoint to manually create analytics data for testing.

## Alert Types

- **overcrowding** - Room exceeds capacity
- **unauthorized_access** - Activity outside class hours
- **no_activity** - Expected activity but none detected
- **camera_offline** - Camera connection lost

## Frontend Features

### Dashboard
- Total cameras count
- Online/Offline status
- Active alerts
- Recent analytics

### Camera Cards
- Visual status indicators
- Connection details
- AI feature badges
- Quick actions (Test, Analytics)

### Analytics View
- Time-series data
- People count trends
- Occupancy percentages
- Motion activity levels
- Alert history

## Security Considerations

### Production Deployment
1. **Encrypt Passwords**: Store camera passwords encrypted
2. **Network Segmentation**: Isolate camera network
3. **HTTPS Only**: Use secure connections
4. **Access Control**: Limit who can add/modify cameras
5. **Audit Logs**: Track all camera access

### Privacy
- Comply with local privacy laws
- Post signage about monitoring
- Limit face detection use
- Secure analytics data
- Regular data purging

## Integration with Timetable

Cameras can be linked to:
- **Classrooms**: Automatic room association
- **Class Sessions**: Correlate analytics with classes
- **Attendance**: Verify attendance with people count
- **Occupancy**: Track room utilization

## Future Enhancements

- [ ] Real-time video streaming in dashboard
- [ ] Advanced AI models (YOLOv8, etc.)
- [ ] Heatmap generation
- [ ] Behavior analysis
- [ ] Integration with access control
- [ ] Mobile app notifications
- [ ] Video recording and playback
- [ ] Multi-camera views
- [ ] PTZ camera control
- [ ] License plate recognition

## Troubleshooting

### Camera Won't Connect
1. Verify IP address is correct
2. Check network connectivity
3. Confirm port is open (554)
4. Verify credentials
5. Check camera brand selection
6. Try custom RTSP URL

### No Analytics Data
1. Ensure AI features are enabled
2. Check camera is online
3. Verify OpenCV is installed
4. Check backend logs for errors

### Poor Performance
1. Use sub-stream for analytics
2. Reduce processing frequency
3. Optimize AI model settings
4. Check network bandwidth

## Dependencies

### Backend
```
opencv-python
numpy
```

### Camera Requirements
- RTSP support
- Network connectivity
- Proper credentials
- Firmware up-to-date

---

**Developed by KKDES**  
*Smart Campus System - Camera Monitoring Module*
