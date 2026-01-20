# Classroom Management & Live Monitoring

## Overview
The Classroom Management module allows administrators to:
1.  **Generate and Manage QR Codes** for physical classrooms.
2.  **Monitor Live Attendance** in real-time.
3.  **Track Room Usage** and activity stats.

## 🚀 Live Monitoring Features (NEW)
The dashboard now features a reactive, real-time grid that updates instantly upon scanning:

*   **⚡ Auto-Sorting**: Active rooms (where a class is ongoing or a scan recently occurred) automatically jump to the **Top-Left** of the grid.
*   **🟢 Live Visuals**:
    *   **Pulsing Green Border**: Indicates live activity.
    *   **Ping Animation**: A "radar-like" ping in the corner shows recent scans.
    *   **Live Badge**: "LIVE" tag pulses on the card.
*   **📋 Instant Details**:
    *   **Current Session**: Displays the Course Code and Name (e.g., "CS101: Intro to CS").
    *   **Last Student**: Shows the Admission Number of the student who just scanned.
    *   **Timestamp**: Shows the exact time of the scan.

## 🛡️ Scan Audit Logging (NEW)
A robust logging system now tracks **every single scan attempt**, regardless of the outcome.
This data is stored in the `scan_logs` database table.

*   **Data Recorded**:
    *   **Who**: Student ID.
    *   **Where**: Room Code.
    *   **When**: UTC Timestamp.
    *   **Outcome**: Success/Failure status.
    *   **Reason**: Detailed message (e.g., "Not Registered", "No Class Scheduled", "Duplicate Scan").
*   **Purpose**: Security auditing, debugging student complaints, and analyzing room usage patterns beyond simple attendance.

## Usage
1.  Navigate to **Classrooms** in the sidebar.
2.  Ensure QR Codes are generated (Click **"Activate All"** if needed).
3.  Print and place QR codes in rooms.
4.  As students scan, the dashboard will update automatically every 10 seconds.

## Technical Details
*   **Data Source**: `/api/timetable/classrooms-detailed`.
*   **Performance Optimization**:
    *   Uses **Batch Aggregation** to fetch stats for all 50+ rooms in just **3 database queries**.
    *   Eliminates N+1 query overhead.
    *   Details are lazily loaded only for active rooms.
*   **Sorting Logic**: `Active > Recent Activity > Alphabetical`.
