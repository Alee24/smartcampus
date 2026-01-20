# 📊 Reports & Automation Guide

## 🏫 Course Reports Page
A new "Courses" page has been added to the sidebar.
*   **View All Courses**: List of all courses in the system.
*   **Historical Data**: Click a course to see all past class sessions.
*   **Attendance Summary**: See the number of students present for each session.
*   **Detailed View**: Click on any session to expand and see the full list of students scanned in real-time.
*   **CSV Export options**:
    *   **"Only This Class"**: Download the register for a specific session.
    *   **"Weekly Report"**: Download a combined report for *all* sessions of the course that occurred in that week.
*   **CSV Content**: Reports now include detailed columns: `Admission Number`, `Student Name`, `Course`, `Room`, `Date`, `Time Scanned`, and `Status`.

## 🤖 Automatic Daily Email Reports
The system now includes an automated scheduler that runs daily at **18:00 (6:00 PM)**.

### How it works:
1.  The system identifies all Class Sessions that occurred "Today".
2.  For each session, it checks if the assigned **Lecturer** has a valid email address.
3.  It generates a **CSV Attendance Report** for that specific class.
4.  It sends an email to the Lecturer with the subject `Daily Attendance: [Course Code] - [Date]` and attaches the CSV file.

### Configuration
*   **Scheduler Time**: Currently set to 18:00 daily (`backend/app/scheduler.py`).
*   **Email Settings**: Configured via Environment Variables or `backend/app/email_utils.py`.
    *   `MAIL_USERNAME`
    *   `MAIL_PASSWORD`
    *   `MAIL_SERVER` (Default: smtp.gmail.com)
    *   `MAIL_PORT` (Default: 587)

### Troubleshooting
*   **No Email Sent?**: Ensure the Lecturer user has a valid email in the database.
*   **Mock Mode**: If email credentials are not set in the environment, the system prints the "Mock Email" details to the backend console instead of sending real emails.
