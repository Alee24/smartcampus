"""
Migration script for Camera Monitoring System
Creates cameras and camera_analytics tables
"""
import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate_camera_system():
    async with engine.begin() as conn:
        print("🎥 Migrating Camera Monitoring System...")
        
        # Create cameras table
        print("\n📋 Creating 'cameras' table...")
        create_cameras = """
        CREATE TABLE IF NOT EXISTS cameras (
            id CHAR(36) PRIMARY KEY,
            camera_name VARCHAR(200) NOT NULL,
            camera_code VARCHAR(50) UNIQUE NOT NULL,
            ip_address VARCHAR(50) NOT NULL,
            port INT DEFAULT 554,
            username VARCHAR(100),
            password VARCHAR(255),
            camera_brand VARCHAR(50) DEFAULT 'hikvision',
            protocol VARCHAR(20) DEFAULT 'rtsp',
            rtsp_url VARCHAR(500),
            classroom_id CHAR(36),
            location_description TEXT,
            status VARCHAR(50) DEFAULT 'offline',
            is_active BOOLEAN DEFAULT TRUE,
            enable_people_counting BOOLEAN DEFAULT TRUE,
            enable_face_detection BOOLEAN DEFAULT FALSE,
            enable_motion_detection BOOLEAN DEFAULT TRUE,
            enable_object_detection BOOLEAN DEFAULT FALSE,
            last_seen DATETIME,
            last_error TEXT,
            INDEX idx_camera_code (camera_code),
            INDEX idx_classroom (classroom_id),
            FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL
        )
        """
        await conn.execute(text(create_cameras))
        print("   ✓ Created 'cameras' table")
        
        # Create camera_analytics table
        print("\n📋 Creating 'camera_analytics' table...")
        create_analytics = """
        CREATE TABLE IF NOT EXISTS camera_analytics (
            id CHAR(36) PRIMARY KEY,
            camera_id CHAR(36) NOT NULL,
            timestamp DATETIME NOT NULL,
            people_count INT,
            people_entering INT,
            people_exiting INT,
            occupancy_percentage FLOAT,
            motion_level VARCHAR(20),
            activity_score FLOAT,
            detected_objects JSON,
            class_session_id CHAR(36),
            is_alert BOOLEAN DEFAULT FALSE,
            alert_type VARCHAR(50),
            alert_message TEXT,
            snapshot_url VARCHAR(500),
            INDEX idx_camera (camera_id),
            INDEX idx_timestamp (timestamp),
            INDEX idx_session (class_session_id),
            FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE,
            FOREIGN KEY (class_session_id) REFERENCES class_sessions(id) ON DELETE SET NULL
        )
        """
        await conn.execute(text(create_analytics))
        print("   ✓ Created 'camera_analytics' table")
        
        print("\n✅ Camera Monitoring System Migration Complete!")
        print("\n📊 New Tables:")
        print("   - cameras: IP camera configuration and status")
        print("   - camera_analytics: AI-generated analytics and statistics")

if __name__ == "__main__":
    asyncio.run(migrate_camera_system())
