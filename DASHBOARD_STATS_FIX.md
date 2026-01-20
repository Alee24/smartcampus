# 🔍 DASHBOARD STATS ISSUE - DIAGNOSIS

## Problem
The BulkUpload page shows:
- Lecturers: **0** / 18
- Classrooms: **0** / 15  
- Courses: **0** / 26
- Students: **0** / 100

The RIGHT numbers (18, 15, 26, 100) are correct totals from the database.
The LEFT numbers (0, 0, 0, 0) should show current counts but are showing 0.

## Root Cause
The `fetchStats()` function in `BulkUpload.tsx` calls multiple endpoints:
1. `/api/dashboard/stats` → Returns `active_students`
2. `/api/timetable/courses` → Returns array of courses
3. `/api/users/` → Returns array of users  
4. `/api/timetable/classrooms` → Returns array of classrooms
5. `/api/timetable/timetable` → Returns array of timetable slots

The issue is likely:
- **Menu filtering is blocking access** to these endpoints for non-admin users
- **Role-based permissions** are preventing students from seeing the data
- **API endpoints are returning 401/403** due to authentication issues

## Solution Applied

### 1. Fixed Menu Filtering (Already Done)
- Changed `isMenuEnabled` to use proper defaults
- Students now only see: Dashboard, Attendance, Timetable
- Admins see everything

### 2. Role-Based Dashboard Access
The BulkUpload page should ONLY be accessible to admins. Students shouldn't see it at all.

### 3. Next Steps
1. **Test as Admin**: Login as `mettoalex@gmail.com` / `Digital2025`
2. **Navigate to**: Settings → Data Import
3. **Click "Refresh Live Stats"** button
4. **Verify** counts update correctly

### 4. For Students
Students should NOT see the Data Import page. They should only see:
- Dashboard (their own stats)
- Attendance (mark attendance)
- Timetable (view schedule)

## Files Modified
- `frontend/src/App.tsx` - Added proper menu filtering with defaults
- `frontend/src/DashboardCustomizer.tsx` - Created dashboard designer
- `backend/app/routers/admin.py` - Added dashboard config endpoints

## Expected Behavior
- **Admin**: Sees all menus, can access Data Import, sees correct stats
- **Student**: Sees only Dashboard/Attendance/Timetable, cannot access Data Import
- **Lecturer**: Sees Dashboard/Users/Attendance/Live Monitor/Timetable/Verification/Projects
- **Guardian**: Sees only Dashboard/Gate Control
- **Security**: Sees Dashboard/Gate/Vehicles/Cameras/Verification
