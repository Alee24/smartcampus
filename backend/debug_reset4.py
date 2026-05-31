import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine('mysql+aiomysql://root:root_password@127.0.0.1:3307/gatepass_v2')
async_session = sessionmaker(engine, class_=AsyncSession)

async def run():
    async with async_session() as session:
        queries = [
            "SET FOREIGN_KEY_CHECKS=0;",
            """
            DELETE FROM users 
            WHERE email != 'mettoalex@gmail.com' 
            AND role_id NOT IN (SELECT id FROM roles WHERE name='SuperAdmin')
            """,
            "DELETE FROM user_faces WHERE user_id NOT IN (SELECT id FROM users)",
            "DELETE FROM user_location_logs WHERE user_id NOT IN (SELECT id FROM users)",
            "DELETE FROM entry_logs WHERE user_id NOT IN (SELECT id FROM users)",
            "DELETE FROM student_course_registrations WHERE student_id NOT IN (SELECT id FROM users)",
            "DELETE FROM attendance_records WHERE student_id NOT IN (SELECT id FROM users)",
            "DELETE FROM scan_logs WHERE student_id NOT IN (SELECT id FROM users)",
            "DELETE FROM vehicle_logs WHERE guard_id NOT IN (SELECT id FROM users)",
            
            "UPDATE entry_logs SET guard_id = NULL WHERE guard_id NOT IN (SELECT id FROM users)",
            "UPDATE gate_scan_logs SET guard_id = NULL WHERE guard_id NOT IN (SELECT id FROM users)",
            "UPDATE vehicles SET owner_id = NULL WHERE owner_id NOT IN (SELECT id FROM users)",
            "UPDATE fleet_trips SET driver_id = NULL WHERE driver_id NOT IN (SELECT id FROM users)",
            "UPDATE fleet_passenger_manifest SET user_id = NULL WHERE user_id NOT IN (SELECT id FROM users)",
            "UPDATE fleet_fuel_logs SET driver_id = NULL WHERE driver_id NOT IN (SELECT id FROM users)",
            "UPDATE courses SET lecturer_id = NULL WHERE lecturer_id NOT IN (SELECT id FROM users)",
            "UPDATE class_sessions SET lecturer_id = NULL WHERE lecturer_id NOT IN (SELECT id FROM users)",
            "UPDATE timetable_slots SET lecturer_id = NULL WHERE lecturer_id NOT IN (SELECT id FROM users)",
            "UPDATE attendance_records SET assisted_by = NULL WHERE assisted_by NOT IN (SELECT id FROM users)",
            "UPDATE system_activities SET actor_id = NULL WHERE actor_id NOT IN (SELECT id FROM users)",
            "UPDATE audit_logs SET user_id = NULL WHERE user_id NOT IN (SELECT id FROM users)",
            "UPDATE event_visitors SET scanned_by = NULL WHERE scanned_by NOT IN (SELECT id FROM users)",
            "UPDATE users SET guardian_id = NULL WHERE guardian_id NOT IN (SELECT id FROM (SELECT id FROM users) AS tmp)",
            "SET FOREIGN_KEY_CHECKS=1;"
        ]
        
        for idx, q in enumerate(queries):
            try:
                await session.execute(text(q))
                print(f"[{idx}] OK: {q.strip()[:40]}")
            except Exception as e:
                print(f"[{idx}] FAIL: {q.strip()[:40]}\nERROR: {e}")
                return

        try:
            await session.commit()
            print("COMMIT OK")
        except Exception as e:
            print(f"COMMIT FAIL: {e}")

asyncio.run(run())
