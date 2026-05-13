import asyncio
from sqlalchemy import text
from app.database import engine
from app.models import User, Role
from sqlmodel import select

async def migrate_timetable_system():
    async with engine.begin() as conn:
        print("🔄 Migrating to new Timetable System...")
        
        # Helper to check columns
        def get_columns(connection, table_name):
            from sqlalchemy import inspect
            inspector = inspect(connection)
            if not inspector.has_table(table_name):
                return []
            return [c['name'] for c in inspector.get_columns(table_name)]

        # Step 1: Drop old tables
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
        cols = await conn.run_sync(get_columns, 'courses')
        new_cols = {
            "department": "VARCHAR(100)",
            "credits": "INT DEFAULT 3",
            "semester": "VARCHAR(50)",
            "classroom_id": "CHAR(36)",
            "lecturer_id": "CHAR(36)"
        }
        for col, type_ in new_cols.items():
            if col not in cols:
                print(f"   Adding column {col} to courses...")
                try:
                    await conn.execute(text(f"ALTER TABLE courses ADD COLUMN {col} {type_}"))
                except Exception as e:
                    print(f"   ⚠ Failed to add {col}: {e}")
        
        # Drop old room_number
        if "room_number" in cols:
            try:
                await conn.execute(text("ALTER TABLE courses DROP COLUMN room_number"))
                print("   ✓ Dropped room_number from courses")
            except: pass

        # Add foreign keys (using try-except to avoid error if they exist)
        try:
            await conn.execute(text("ALTER TABLE courses ADD CONSTRAINT fk_courses_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL"))
        except: pass
        try:
            await conn.execute(text("ALTER TABLE courses ADD CONSTRAINT fk_courses_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE SET NULL"))
        except: pass
        
        # Step 4: Create timetable_slots table
        print("\n📋 Step 4: Creating 'timetable_slots' table...")
        create_timetable = """
        CREATE TABLE IF NOT EXISTS timetable_slots (
            id CHAR(36) PRIMARY KEY,
            course_id CHAR(36) NOT NULL,
            classroom_id CHAR(36) NOT NULL,
            lecturer_id CHAR(36),
            day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            effective_from DATE,
            effective_until DATE,
            is_active BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
            FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE SET NULL
        )
        """
        await conn.execute(text(create_timetable))
        
        # Ensure lecturer_id is nullable if table already exists
        try:
            await conn.execute(text("ALTER TABLE timetable_slots MODIFY lecturer_id CHAR(36) NULL;"))
            print("   ✓ Ensured lecturer_id is nullable in timetable_slots")
        except Exception as e:
            print(f"   ⚠ Could not modify lecturer_id: {e}")
            
        print("   ✓ Created/Updated 'timetable_slots' table")
        
        # Step 5: Modify class_sessions table
        print("\n📋 Step 5: Modifying 'class_sessions' table...")
        cols = await conn.run_sync(get_columns, 'class_sessions')
        
        # Rename class_id to course_id if exists
        if "class_id" in cols:
            try:
                await conn.execute(text("ALTER TABLE class_sessions CHANGE COLUMN class_id course_id CHAR(36)"))
                print("   ✓ Renamed class_id to course_id")
            except: pass
        elif "course_id" not in cols:
            await conn.execute(text("ALTER TABLE class_sessions ADD COLUMN course_id CHAR(36)"))
            print("   ✓ Added course_id to class_sessions")

        new_session_cols = {
            "timetable_slot_id": "CHAR(36)",
            "classroom_id": "CHAR(36)",
            "lecturer_id": "CHAR(36)",
            "status": "VARCHAR(50) DEFAULT 'scheduled'"
        }
        for col, type_ in new_session_cols.items():
            if col not in cols and col != "course_id": # course_id handled above
                print(f"   Adding column {col} to class_sessions...")
                try:
                    await conn.execute(text(f"ALTER TABLE class_sessions ADD COLUMN {col} {type_}"))
                except Exception as e:
                    print(f"   ⚠ Failed to add {col}: {e}")

        # Add constraints
        constraints = [
            ("fk_sessions_course", "course_id", "courses(id)", "CASCADE"),
            ("fk_sessions_timetable", "timetable_slot_id", "timetable_slots(id)", "SET NULL"),
            ("fk_sessions_classroom", "classroom_id", "classrooms(id)", "SET NULL"),
            ("fk_sessions_lecturer", "lecturer_id", "users(id)", "SET NULL")
        ]
        for name, col, ref, on_delete in constraints:
            try:
                await conn.execute(text(f"ALTER TABLE class_sessions ADD CONSTRAINT {name} FOREIGN KEY ({col}) REFERENCES {ref} ON DELETE {on_delete}"))
            except: pass

        print("\n✅ Timetable System Migration Complete!")

if __name__ == "__main__":
    asyncio.run(migrate_timetable_system())
