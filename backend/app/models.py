from typing import Optional, List
from datetime import datetime, date, time
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Relationship, Column, ARRAY
# from pgvector.sqlalchemy import Vector # Commented out for MySQL Local Dev
from sqlalchemy import JSON, Text

# Shared properties
class UUIDModel(SQLModel):
    id: UUID = Field(default_factory=uuid4, primary_key=True)

class Role(UUIDModel, table=True):
    __tablename__ = "roles"
    name: str = Field(unique=True, index=True)
    description: Optional[str] = None
    
    users: List["User"] = Relationship(back_populates="role")

class User(UUIDModel, table=True):
    __tablename__ = "users"
    admission_number: str = Field(unique=True, index=True)
    full_name: str
    school: str
    email: Optional[str] = Field(default=None, unique=True, index=True)
    hashed_password: str
    role_id: UUID = Field(foreign_key="roles.id")
    status: str = Field(default="active") # active, cleared, suspended, Unregistered
    has_smartphone: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # New Fields
    profile_image: Optional[str] = None
    admission_date: Optional[date] = None
    expiry_date: Optional[date] = None
    
    # Phase 2 Updates
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    guardian_id: Optional[UUID] = Field(default=None, foreign_key="users.id", nullable=True)

    role: Role = Relationship(back_populates="users")
    # Self-referential relationship for Guardian
    # guardian: Optional["User"] = Relationship(sa_relationship_kwargs={"remote_side": "User.id"})
    # Actually, simpler to just have the ID for now or define explicit relationship if needed.
    # Let's define wards (students) for the guardian
    # wards: List["User"] = Relationship(back_populates="guardian") 
    
    faces: List["UserFace"] = Relationship(back_populates="user")
    entry_logs: List["EntryLog"] = Relationship(back_populates="user", sa_relationship_kwargs={"foreign_keys": "EntryLog.user_id"})
    registrations: List["StudentCourseRegistration"] = Relationship(back_populates="student")
    location_logs: List["UserLocationLog"] = Relationship(back_populates="user")

class UserFace(UUIDModel, table=True):
    __tablename__ = "user_faces"
    user_id: UUID = Field(foreign_key="users.id")
    image_path: str
    # Vector size 128 (default for FaceNet) or 512 (ArcFace). default to 512 for safety/quality
    # face_embedding: List[float] = Field(sa_column=Column(Vector(512)))
    # MySQL Fallback: Store as JSON
    face_embedding: List[float] = Field(sa_column=Column(JSON))

    user: User = Relationship(back_populates="faces")

class UserLocationLog(UUIDModel, table=True):
    __tablename__ = "user_location_logs"
    user_id: UUID = Field(foreign_key="users.id")
    
    # Location & Network Data
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ip_address: Optional[str] = None
    network_type: Optional[str] = None # wifi, cellular
    
    # Context
    scanned_code: Optional[str] = None # The QR code content (e.g. Class Room Code)
    context_type: str = "scan" # scan, login, background
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Device Info
    device_info: Optional[dict] = Field(default={}, sa_column=Column(JSON))
    
    user: User = Relationship(back_populates="location_logs")



class Gate(UUIDModel, table=True):
    __tablename__ = "gates"
    name: str = Field(unique=True, index=True)
    location: Optional[str] = None
    is_active: bool = True

class EntryLog(UUIDModel, table=True):
    __tablename__ = "entry_logs"
    user_id: UUID = Field(foreign_key="users.id")
    gate_id: UUID = Field(foreign_key="gates.id")
    entry_time: datetime = Field(default_factory=datetime.utcnow)
    exit_time: Optional[datetime] = None
    method: str # qr, face, manual
    guard_id: Optional[UUID] = Field(foreign_key="users.id", nullable=True)
    status: str # allowed, rejected
    ip_address: Optional[str] = None
    verification_image: Optional[str] = None

    user: User = Relationship(back_populates="entry_logs", sa_relationship_kwargs={"foreign_keys": "EntryLog.user_id"})

class GateScanLog(UUIDModel, table=True):
    __tablename__ = "gate_scan_logs"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    scan_type: str
    scanned_value: Optional[str] = None
    status: str
    
    gate_id: Optional[UUID] = Field(foreign_key="gates.id", nullable=True)
    guard_id: Optional[UUID] = Field(foreign_key="users.id", nullable=True)
    scanner_name: Optional[str] = None
    
    details: Optional[str] = None
    
    gate: Optional[Gate] = Relationship()

class Vehicle(UUIDModel, table=True):
    __tablename__ = "vehicles"
    plate_number: str = Field(unique=True, index=True)
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    
    # Driver Details
    driver_name: Optional[str] = None
    driver_contact: Optional[str] = None
    driver_id_number: Optional[str] = None

    logs: List["VehicleLog"] = Relationship(back_populates="vehicle")

class VehicleLog(UUIDModel, table=True):
    __tablename__ = "vehicle_logs"
    vehicle_id: UUID = Field(foreign_key="vehicles.id")
    vehicle_images: Optional[dict] = Field(default={}, sa_column=Column(JSON))
    detected_passengers: Optional[int] = None
    entry_time: datetime = Field(default_factory=datetime.utcnow)
    exit_time: Optional[datetime] = None
    gate_id: UUID = Field(foreign_key="gates.id")
    guard_id: Optional[UUID] = Field(foreign_key="users.id")
    manual_override: bool = Field(default=False)

    vehicle: Vehicle = Relationship(back_populates="logs")

# Classroom/Room Management
class Classroom(UUIDModel, table=True):
    __tablename__ = "classrooms"
    room_code: str = Field(unique=True, index=True)  # e.g., "LH1", "LAB-CS-01"
    room_name: str  # e.g., "Lecture Hall 1", "Computer Lab"
    building: Optional[str] = None
    floor: Optional[str] = None
    capacity: int = 0
    room_type: str = "lecture_hall"  # lecture_hall, lab, seminar_room, auditorium
    
    # Amenities stored as JSON
    amenities: Optional[dict] = Field(default={}, sa_column=Column(JSON))
    # Example: {"projector": true, "speaker": true, "pointer": true, "extension": true, "tv_screen": true, "whiteboard": true, "ac": true}
    
    status: str = "available"  # available, maintenance, reserved
    
    # QR Code stored as base64 data URL
    qr_code: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    # Relationships
    courses: List["Course"] = Relationship(back_populates="classroom")
    timetable_slots: List["TimetableSlot"] = Relationship(back_populates="classroom")

class Course(UUIDModel, table=True):
    __tablename__ = "courses"
    course_code: str = Field(unique=True, index=True)
    course_name: str
    department: Optional[str] = None
    credits: Optional[int] = 3
    semester: Optional[str] = None  # e.g., "Fall 2024", "Spring 2025"
    
    # Default classroom assignment (can be overridden in timetable)
    classroom_id: Optional[UUID] = Field(default=None, foreign_key="classrooms.id")
    
    # Lecturer assignment
    lecturer_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    
    classroom: Optional[Classroom] = Relationship(back_populates="courses")
    timetable_slots: List["TimetableSlot"] = Relationship(back_populates="course")
    sessions: List["ClassSession"] = Relationship(back_populates="course")
    registrations: List["StudentCourseRegistration"] = Relationship(back_populates="course")

class StudentCourseRegistration(UUIDModel, table=True):
    __tablename__ = "student_course_registrations"
    student_id: UUID = Field(foreign_key="users.id")
    course_id: UUID = Field(foreign_key="courses.id")
    semester: Optional[str] = "Current" 
    registered_at: datetime = Field(default_factory=datetime.utcnow)
    
    student: User = Relationship(back_populates="registrations")
    course: Course = Relationship(back_populates="registrations")

class TimetableSlot(UUIDModel, table=True):
    """Recurring weekly schedule for courses"""
    __tablename__ = "timetable_slots"
    
    course_id: UUID = Field(foreign_key="courses.id")
    classroom_id: UUID = Field(foreign_key="classrooms.id")
    lecturer_id: UUID = Field(foreign_key="users.id")
    
    # Day and time
    day_of_week: int = Field(ge=0, le=6)  # 0=Monday, 6=Sunday
    start_time: time
    end_time: time
    
    # Metadata
    effective_from: Optional[date] = None  # When this schedule starts
    effective_until: Optional[date] = None  # When this schedule ends
    is_active: bool = True
    
    # Relationships
    course: Course = Relationship(back_populates="timetable_slots")
    classroom: Classroom = Relationship(back_populates="timetable_slots")

class ClassSession(UUIDModel, table=True):
    """Individual class sessions (generated from timetable or ad-hoc)"""
    __tablename__ = "class_sessions"
    
    course_id: UUID = Field(foreign_key="courses.id")
    timetable_slot_id: Optional[UUID] = Field(default=None, foreign_key="timetable_slots.id")
    
    session_date: date
    start_time: time
    end_time: time
    
    classroom_id: Optional[UUID] = Field(default=None, foreign_key="classrooms.id")
    lecturer_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    
    # QR Code for attendance
    qr_code: Optional[str] = None
    room_unique_number: Optional[str] = None
    
    # Session status
    status: str = "scheduled"  # scheduled, ongoing, completed, cancelled
    active: bool = True
    
    # Relationships
    course: Course = Relationship(back_populates="sessions")
    attendance: List["AttendanceRecord"] = Relationship(back_populates="session")

class AttendanceRecord(UUIDModel, table=True):
    __tablename__ = "attendance_records"
    session_id: UUID = Field(foreign_key="class_sessions.id")
    student_id: UUID = Field(foreign_key="users.id")
    scan_time: datetime = Field(default_factory=datetime.utcnow)
    live_image: Optional[str] = None
    face_match_score: Optional[float] = None
    assisted_by: Optional[UUID] = Field(foreign_key="users.id", nullable=True)
    status: str # present, flagged, absent
    connection_type: Optional[str] = None
    connection_name: Optional[str] = None
    metadata_info: Optional[str] = None # JSON string

    session: ClassSession = Relationship(back_populates="attendance")
    cheating_flags: List["CheatingFlag"] = Relationship(back_populates="attendance_record")

class CheatingFlag(UUIDModel, table=True):
    __tablename__ = "cheating_flags"
    attendance_id: UUID = Field(foreign_key="attendance_records.id")
    reason: str
    similarity_score: float

    attendance_record: AttendanceRecord = Relationship(back_populates="cheating_flags")



class AuditLog(UUIDModel, table=True):
    __tablename__ = "audit_logs"
    user_id: Optional[UUID] = Field(foreign_key="users.id")
    action: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SystemConfig(UUIDModel, table=True):
    __tablename__ = "system_configs"
    key: str = Field(unique=True, index=True)
    value: str
    category: str # e.g., "email", "api", "general"
    is_encrypted: bool = False

class SystemActivity(UUIDModel, table=True):
    __tablename__ = "system_activities"
    
    actor_id: Optional[UUID] = Field(foreign_key="users.id", nullable=True)
    action_type: str  # CREATE, UPDATE, DELETE, SCAN, LOGIN, ERROR, SYSTEM
    entity_type: str  # USER, CLASSROOM, COURSE, SESSION, SYSTEM
    entity_id: Optional[str] = None # UUID string or code
    description: str
    metadata_info: Optional[dict] = Field(default={}, sa_column=Column(JSON))
    ip_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Optional relationship to actor (User)
    actor: Optional["User"] = Relationship()

# Camera Monitoring System
class Camera(UUIDModel, table=True):
    __tablename__ = "cameras"
    
    camera_name: str
    camera_code: str = Field(unique=True, index=True)  # e.g., "CAM-LH1-01"
    
    # Connection Details
    ip_address: str
    port: int = 554  # Default RTSP port
    username: Optional[str] = None
    password: Optional[str] = None  # Should be encrypted in production
    
    # Camera Type & Protocol
    camera_brand: str = "hikvision"  # hikvision, dahua, axis, generic
    protocol: str = "rtsp"  # rtsp, http, onvif
    rtsp_url: Optional[str] = None  # Full RTSP URL if custom
    
    # Location
    classroom_id: Optional[UUID] = Field(default=None, foreign_key="classrooms.id")
    location_description: Optional[str] = None
    
    # Status
    status: str = "offline"  # online, offline, error, maintenance
    is_active: bool = True
    
    # AI Features
    enable_people_counting: bool = True
    enable_face_detection: bool = False
    enable_motion_detection: bool = True
    enable_object_detection: bool = False
    
    # Metadata
    last_seen: Optional[datetime] = None
    last_error: Optional[str] = None
    
    # Relationships
    analytics: List["CameraAnalytics"] = Relationship(back_populates="camera")

class CameraAnalytics(UUIDModel, table=True):
    """AI-generated analytics from camera feeds"""
    __tablename__ = "camera_analytics"
    
    camera_id: UUID = Field(foreign_key="cameras.id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # People Analytics
    people_count: Optional[int] = None
    people_entering: Optional[int] = None
    people_exiting: Optional[int] = None
    
    # Occupancy
    occupancy_percentage: Optional[float] = None  # Based on classroom capacity
    
    # Activity Level
    motion_level: Optional[str] = None  # low, medium, high
    activity_score: Optional[float] = None  # 0-100
    
    # Detected Objects
    detected_objects: Optional[dict] = Field(default={}, sa_column=Column(JSON))
    # Example: {"person": 25, "chair": 30, "laptop": 5}
    
    # Session Correlation
    class_session_id: Optional[UUID] = Field(default=None, foreign_key="class_sessions.id")
    
    # Alerts
    is_alert: bool = False
    alert_type: Optional[str] = None  # overcrowding, unauthorized_access, no_activity
    alert_message: Optional[str] = None
    
    # Raw Data (optional, for debugging)
    snapshot_url: Optional[str] = None
    
    # Relationships
    camera: Camera = Relationship(back_populates="analytics")

class ScanLog(UUIDModel, table=True):
    """Immutable log of all QR scan attempts"""
    __tablename__ = "scan_logs"
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Who
    student_id: UUID = Field(foreign_key="users.id")
    
    # Where
    room_code: str = Field(index=True)
    
    # Outcome
    is_successful: bool = False
    status_message: str # e.g. "Allowed", "Not Registered", "No Class"
    
    # Context
    class_session_id: Optional[UUID] = Field(foreign_key="class_sessions.id", nullable=True)
    detected_location: Optional[str] = None # For future geo-fencing
    
    # Relationships
    student: User = Relationship()
    session: Optional[ClassSession] = Relationship()

class Visitor(UUIDModel, table=True):
    __tablename__ = "visitors"
    
    first_name: str
    last_name: str
    phone_number: str
    id_number: str = Field(index=True)
    
    visit_details: str 
    visitor_type: str = "visitor" # visitor, taxi, delivery
    
    time_in: datetime = Field(default_factory=datetime.utcnow)
    time_out: Optional[datetime] = None
    
    gate_id: Optional[UUID] = Field(foreign_key="gates.id", nullable=True) # Link to Gate
    status: str = "checked_in"

# Event Management Models
class Event(UUIDModel, table=True):
    __tablename__ = "events"
    name: str
    host: str
    school: str
    description: Optional[str] = None
    expected_visitors: str # 0-20, 20-40, 40-80, 100+
    event_type: str 
    event_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    qr_code_token: str = Field(unique=True, index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    visitors: List["EventVisitor"] = Relationship(back_populates="event")

class EventVisitor(UUIDModel, table=True):
    __tablename__ = "event_visitors"
    event_id: UUID = Field(foreign_key="events.id")
    visitor_name: str
    visitor_identifier: str # Admission No or ID No
    phone_number: str
    email: Optional[str] = None
    status: str = "pre_registered" # pre_registered, checked_in
    bio_data: Optional[dict] = Field(default={}, sa_column=Column(JSON)) 
    entry_time: datetime = Field(default_factory=datetime.utcnow)
    scanned_by: Optional[UUID] = Field(foreign_key="users.id", nullable=True)

    event: Event = Relationship(back_populates="visitors")
