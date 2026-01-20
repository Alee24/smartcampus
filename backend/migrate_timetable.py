"""
Migration script for Timetable System
- Drops old tables (classes)
- Creates new tables (classrooms, timetable_slots)
- Modifies courses and class_sessions tables
"""
import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate_timetable_system():
    async with engine.begin() as conn:
        print("🔄 Migrating to new Timetable System...")
        
        # Step 1: Drop old tables that are being replaced
        print("\n📋 Step 1: Dropping old tables...")
        try:
            await conn.execute(text("DROP TABLE IF EXISTS classes CASCADE"))
            print("   ✓ Dropped 'classes' table")
        except Exception as e:
            print(f"   ⚠ Could not drop classes: {e}")
        
        # Step 2: Create classrooms table
        print("\n📋 Step 2: Creating 'classrooms' table...")
        create_classrooms = """
        CREATE TABLE IF NOT EXISTS classrooms (
            id CHAR(36) PRIMARY KEY,
            room_code VARCHAR(50) UNIQUE NOT NULL,
            room_name VARCHAR(200) NOT NULL,
            building VARCHAR(100),
            floor INT,
            capacity INT DEFAULT 0,
            room_type VARCHAR(50) DEFAULT 'lecture_hall',
            amenities JSON,
            status VARCHAR(50) DEFAULT 'available',
            INDEX idx_room_code (room_code)
        )
        """
        await conn.execute(text(create_classrooms))
        print("   ✓ Created 'classrooms' table")
        
        # Step 3: Modify courses table
        print("\n📋 Step 3: Modifying 'courses' table...")
        try:
            # Add new columns to courses
            await conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS department VARCHAR(100)"))
            await conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS credits INT DEFAULT 3"))
            await conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS semester VARCHAR(50)"))
            await conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS classroom_id CHAR(36)"))
            await conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS lecturer_id CHAR(36)"))
            
            # Drop old room_number column if exists
            try:
                await conn.execute(text("ALTER TABLE courses DROP COLUMN room_number"))
            except:
                pass
            
            # Add foreign keys
            await conn.execute(text("""
                ALTER TABLE courses 
                ADD CONSTRAINT fk_courses_classroom 
                FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL
            """))
            
            await conn.execute(text("""
                ALTER TABLE courses 
                ADD CONSTRAINT fk_courses_lecturer 
                FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE SET NULL
            """))
            
            print("   ✓ Modified 'courses' table")
        except Exception as e:
            print(f"   ⚠ Courses table modification: {e}")
        
        # Step 4: Create timetable_slots table
        print("\n📋 Step 4: Creating 'timetable_slots' table...")
        create_timetable = """
        CREATE TABLE IF NOT EXISTS timetable_slots (
            id CHAR(36) PRIMARY KEY,
            course_id CHAR(36) NOT NULL,
            classroom_id CHAR(36) NOT NULL,
            lecturer_id CHAR(36) NOT NULL,
            day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            effective_from DATE,
            effective_until DATE,
            is_active BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
            FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
        await conn.execute(text(create_timetable))
        print("   ✓ Created 'timetable_slots' table")
        
        # Step 5: Modify class_sessions table
        print("\n📋 Step 5: Modifying 'class_sessions' table...")
        try:
            # Drop old foreign key to classes
            try:
                await conn.execute(text("ALTER TABLE class_sessions DROP FOREIGN KEY class_sessions_ibfk_1"))
            except:
                pass
            
            # Rename class_id to course_id if it exists
            try:
                await conn.execute(text("ALTER TABLE class_sessions CHANGE COLUMN class_id course_id CHAR(36)"))
            except:
                # If column doesn't exist or already renamed
                await conn.execute(text("ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS course_id CHAR(36)"))
            
            # Add new columns
            await conn.execute(text("ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS timetable_slot_id CHAR(36)"))
            await conn.execute(text("ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS classroom_id CHAR(36)"))
            await conn.execute(text("ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS lecturer_id CHAR(36)"))
            await conn.execute(text("ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled'"))
            
            # Add foreign keys
            await conn.execute(text("""
                ALTER TABLE class_sessions 
                ADD CONSTRAINT fk_sessions_course 
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
            """))
            
            await conn.execute(text("""
                ALTER TABLE class_sessions 
                ADD CONSTRAINT fk_sessions_timetable 
                FOREIGN KEY (timetable_slot_id) REFERENCES timetable_slots(id) ON DELETE SET NULL
            """))
            
            await conn.execute(text("""
                ALTER TABLE class_sessions 
                ADD CONSTRAINT fk_sessions_classroom 
                FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL
            """))
            
            await conn.execute(text("""
                ALTER TABLE class_sessions 
                ADD CONSTRAINT fk_sessions_lecturer 
                FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE SET NULL
            """))
            
            print("   ✓ Modified 'class_sessions' table")
        except Exception as e:
            print(f"   ⚠ Class sessions modification: {e}")
        
        print("\n✅ Timetable System Migration Complete!")
        print("\n📊 New Structure:")
        print("   - classrooms: Room management with amenities")
        print("   - courses: Enhanced with department, credits, semester")
        print("   - timetable_slots: Weekly recurring schedule")
        print("   - class_sessions: Individual session instances")

if __name__ == "__main__":
    asyncio.run(migrate_timetable_system())
