# Smart Campus System - User Guide

Welcome to the **Smart Campus System**, a comprehensive platform for managing campus security, user data, academic scheduling, and attendance using advanced AI and real-time monitoring.

---

## 📚 Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [User Management](#user-management)
4. [Bulk Ingestion (Smart Setup)](#bulk-ingestion)
5. [Gate Control & Security](#gate-control--security)
6. [Academic Management](#academic-management)
7. [Surveillance System](#surveillance-system)
8. [Administration & Settings](#administration--settings)

---

## 1. Getting Started <a name="getting-started"></a>

### Logging In
Access the system via your web browser.
- **URL**: `http://localhost:5173` (or your deployment URL).
- **Credentials**: Enter your **Admission Number** or **Email Address** and **Password**.
- **SSO**: You can also use **Sign in with Gmail** if your email is registered and Google Integration is active.
- **LDAP**: Corporate/School directory login is supported if configured.

> **Note**: If you encounter login issues, try refreshing the page to ensure you have the latest updates.

### Roles & Permissions
The system dynamically adjusts features based on your role:
- **SuperAdmin**: Full access to all settings, users, and configurations.
- **Security**: Access to Gate Control, Verification, and Live Monitor.
- **Lecturer**: Access to Class Attendance, Timetable, and My Classes.
- **Student**: View Profile, Digital ID, and Personal Timetable (Mobile View).
- **Guardian**: View Ward's status (Entry/Exit logs).

---

## 2. Dashboard Overview <a name="dashboard-overview"></a>
Upon login, you are greeted by the **Command Center**.
- **Live Stats**: Real-time counter of Students on Campus, Active Classes, and Total Users.
- **Quick Actions**: Shortcuts to common tasks (e.g., "Verify ID", "Add User").
- **Activity Feed**: Recent system events (Logins, Entry/Exits).
- **Customization**: Use the **Design** mode to rearrange widgets to your preference.

---

## 3. User Management <a name="user-management"></a>
Manage all campus identities under the **Students / Staff** menu.

### Features
- **View Users**: Searchable list of all Students, Lecturers, Staff, and Guardians.
- **Filter**: Filter by Role, School, or Status.
- **Add User**: Click **"Add User"** to create a single record.
  - *New Feature*: Simultaneous Profile Image Upload. You can fill details and upload a photo in one step.
- **Edit User**: Click on a user row to edit details, reset passwords, or update photos.
- **Delete User**: (Admins Only) Remove a user permanently via the "Delete" button in the Edit modal.

---

## 4. Bulk Ingestion (Smart Setup) <a name="bulk-ingestion"></a>
Under **Settings > Data Import**, use the "Smart Setup Guide" to rapidly populate the system.

### Step-by-Step Flow
1.  **Lecturers**: Upload staff details first.
2.  **Classrooms**: Define physical rooms and capacities.
3.  **Courses**: Upload the academic catalog.
4.  **Timetable**: Schedule classes (linking Courses + Lecturers + Rooms).
5.  **Students**: Upload student registry.
6.  **Registrations**: Map students to courses.
7.  **Photos**: Bulk upload student images via ZIP file.
    - **Option A (Fast)**: Name images matching Admission Numbers (e.g. `STD001.jpg`). No CSV needed.
    - **Option B**: Use a CSV to map random filenames to Admission Numbers.

> **Tip**: Always download the provided **CSV Template** for each step to ensure your data format matches the system requirements.
> **Troubleshooting**: If upload fails with "Could not validate credentials", please **Sign Out** and **Sign In** again to refresh your session.

---

## 5. Gate Control & Security <a name="gate-control--security"></a>
The core security module for managing campus entry and exit.

### Gate Control Panel
- **Manual Check-In/Out**: Search for a user and manually log them in/out.
- **QR Scanning**: Use a webcam or barcode scanner to scan Student Digital IDs.
- **Live Feed**: See real-time scans and AI verification results.

### ID Verification
- **Digital ID**: Verify a student's identity by scanning their card or searching their details.
- **Status Check**: Instantly see if a student is:
  - ✅ **Active**: Allowed entry.
  - ❌ **Suspended**: Access denied.
  - ⚠️ **Expired**: ID needs renewal.

### Visitor Management
New module for tracking external guests.
- **Visitor Logs**: accessible via the "Visitor Logs" sidebar item.
- **Check-In**: Register new visitors with Name, National ID, Phone, and Purpose.
- **Check-Out**: Log the exit time when a visitor leaves.
- **History**: View a searchable list of all past and present visitors.

### Vehicle Intelligence
- Track vehicles entering/leaving campus.
- Log License Plates (manual entry or ALPR integration).

---

## 6. Academic Management <a name="academic-management"></a>

### Timetable
- View the master schedule for the entire campus.
- Filter by Room, Lecturer, or Class Group.
- **Conflict Detection**: The system prevents double-booking rooms.

### Class Attendance
- **Live Classes**: View currently ongoing classes.
- **Mark Attendance**: Lecturers can mark students present/absent digitally.
- **Reports**: Generate attendance reports for courses.

### Classrooms
- Manage capabilities and resources of every room (Projector, Capacity, etc.).

---

## 7. Surveillance System <a name="surveillance-system"></a>
Monitor campus safety with integrated IP Cameras.

- **Live Monitor**: Grid view of connected security cameras.
- **AI Analytics**:
  - **Face Recognition**: Identify blacklisted individuals or authorized personnel.
  - **Crowd Counting**: Estimate occupancy in key areas (Cafeteria, Library).
- **Configuration**: Add RTSP/HTTP camera streams in **Settings > Cameras**.

---

## 8. Administration & Settings <a name="administration--settings"></a>

### Company Settings
- Customize the system branding (Logo, University Name, Colors).
- Set contact details that appear on ID cards and Emails.

### AI Settings
- Tune the sensitivity of Face Recognition.
- Manage matched/known faces database.

### Integrations
- **Google SSO**: Configure Client ID for Gmail Login.
- **LDAP/Active Directory**: Configure server connection for centralized auth.

### Notifications
- Configure Email and SMS alerts for specific events (e.g., "Student Late Arrival").

---

### Support
For technical issues, please contact the IT Department or key system administrators.
**System Version**: 2.0.0 (Smart Campus)
