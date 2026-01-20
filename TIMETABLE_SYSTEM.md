# 📅 Timetable Management System

## Overview
A comprehensive timetable management system for Smart Campus with classroom management, course scheduling, and weekly timetable views.

## Database Structure

### 1. **Classrooms Table**
Manages all physical classroom spaces with amenities.

**Fields:**
- `room_code` - Unique identifier (e.g., "LH1", "LAB-CS-01")
- `room_name` - Full name (e.g., "Lecture Hall 1")
- `building` - Building name
- `floor` - Floor number
- `capacity` - Maximum occupancy
- `room_type` - Type: lecture_hall, lab, seminar_room, auditorium
- `amenities` - JSON object with available equipment
- `status` - available, maintenance, reserved

**Amenities Options:**
- Projector
- Speaker System
- Laser Pointer
- Extension Cables
- TV Screen
- Whiteboard
- Smart Board
- Air Conditioning
- Microphone
- Computers/Lab Equipment

### 2. **Courses Table**
Stores course information with default assignments.

**Fields:**
- `course_code` - Unique code (e.g., "CS101")
- `course_name` - Full course name
- `department` - Academic department
- `credits` - Credit hours (default: 3)
- `semester` - Current semester (e.g., "Fall 2024")
- `classroom_id` - Default classroom assignment
- `lecturer_id` - Assigned lecturer

### 3. **Timetable Slots Table**
Weekly recurring schedule for courses.

**Fields:**
- `course_id` - Link to course
- `classroom_id` - Assigned classroom
- `lecturer_id` - Assigned lecturer
- `day_of_week` - 0=Monday, 6=Sunday
- `start_time` - Class start time
- `end_time` - Class end time
- `effective_from` - Schedule start date
- `effective_until` - Schedule end date
- `is_active` - Active status

### 4. **Class Sessions Table**
Individual class instances (generated from timetable or ad-hoc).

**Fields:**
- `course_id` - Link to course
- `timetable_slot_id` - Link to recurring slot (if applicable)
- `session_date` - Specific date
- `start_time` - Session start
- `end_time` - Session end
- `classroom_id` - Classroom for this session
- `lecturer_id` - Lecturer for this session
- `qr_code` - Attendance QR code
- `status` - scheduled, ongoing, completed, cancelled

## API Endpoints

### Classrooms
- `GET /api/timetable/classrooms` - List all classrooms
- `POST /api/timetable/classrooms` - Create classroom
- `PUT /api/timetable/classrooms/{id}` - Update classroom

### Courses
- `GET /api/timetable/courses` - List all courses (with enriched data)
- `POST /api/timetable/courses` - Create course
- `PUT /api/timetable/courses/{id}` - Update course

### Timetable
- `GET /api/timetable/timetable` - Get timetable slots (filterable by day)
- `GET /api/timetable/timetable/weekly` - Get organized weekly view
- `POST /api/timetable/timetable` - Create timetable slot (with conflict detection)
- `DELETE /api/timetable/timetable/{id}` - Delete slot

### Amenities
- `GET /api/timetable/amenities/options` - Get available amenity options

## Features

### ✅ Classroom Management
- Create and manage physical classrooms
- Track amenities and equipment
- Set capacity and room types
- Monitor room status

### ✅ Course Management
- Create courses with codes and names
- Assign default lecturers and classrooms
- Track credits and departments
- Organize by semester

### ✅ Timetable Scheduling
- Create recurring weekly schedules
- Assign courses to specific days and times
- Conflict detection for double-booking
- Visual weekly calendar view

### ✅ Smart Features
- **Conflict Detection**: Prevents double-booking of classrooms
- **Enriched Data**: API responses include lecturer names, room codes, etc.
- **Flexible Scheduling**: Support for effective date ranges
- **Visual Calendar**: 7-day week view with color-coded slots

## Frontend Interface

### Three Main Tabs:

1. **Weekly Timetable**
   - 7-column grid (Monday-Sunday)
   - Shows all scheduled classes
   - Displays course code, name, time, room, and lecturer
   - Add new slots with conflict checking

2. **Courses**
   - Table view of all courses
   - Shows code, name, department, lecturer, room, credits
   - Create and edit courses
   - Assign default lecturers and classrooms

3. **Classrooms**
   - Card-based grid view
   - Shows room code, name, capacity, type
   - Visual amenity badges
   - Status indicators (available/maintenance)
   - Create and edit classrooms

## Usage Workflow

1. **Setup Classrooms**
   - Add all physical rooms
   - Configure amenities for each room
   - Set capacities

2. **Create Courses**
   - Add courses with codes
   - Assign lecturers
   - Set default classrooms

3. **Build Timetable**
   - Create weekly recurring slots
   - Assign courses to specific days/times
   - System prevents conflicts
   - View in weekly calendar

4. **Generate Sessions**
   - System can auto-generate individual sessions from timetable
   - Sessions used for attendance tracking
   - Can create ad-hoc sessions as needed

## Migration

Run the migration script to update the database:
```bash
python migrate_timetable.py
```

This will:
- Drop old `classes` table
- Create `classrooms` table
- Create `timetable_slots` table
- Update `courses` table with new fields
- Update `class_sessions` table structure

## Next Steps

- [ ] Auto-generate sessions from timetable slots
- [ ] Room booking system for ad-hoc events
- [ ] Timetable export (PDF, Excel)
- [ ] Student timetable view (personalized)
- [ ] Lecturer dashboard with their schedule
- [ ] Room utilization analytics
- [ ] Mobile app integration

---

**Developed by KKDES**  
*Smart Campus System - Timetable Module*
