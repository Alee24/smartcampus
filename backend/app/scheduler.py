from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database import engine
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.models import ClassSession, AttendanceRecord, User, Course, EntryLog, Visitor
from app.email_utils import send_attendance_email
from datetime import datetime
from app.utils.timezone import get_eat_time
import csv
import os

scheduler = AsyncIOScheduler()

async def generate_and_send_daily_reports():
    print("Running Daily Attendance Reporting Job...")
    today = get_eat_time().date()
    
    async with AsyncSession(engine) as session:
        # Find distinct sessions today
        # We assume lecturer_id is on ClassSession (it is)
        query = (
            select(ClassSession, Course, User)
            .join(Course, ClassSession.course_id == Course.id)
            .join(User, ClassSession.lecturer_id == User.id)
            .where(ClassSession.session_date == today)
        )
        
        results = await session.exec(query)
        sessions_data = results.all()
        
        print(f"Found {len(sessions_data)} sessions for today: {today}")
        
        for class_session, course, lecturer in sessions_data:
            if not lecturer.email:
                print(f"Skipping {course.course_code}: Lecturer has no email.")
                continue
                
            # Fetch Attendance (Present students)
            att_query = (
                select(AttendanceRecord, User)
                .join(User, AttendanceRecord.student_id == User.id)
                .where(AttendanceRecord.session_id == class_session.id)
                .order_by(AttendanceRecord.scan_time)
            )
            attendance_rows = (await session.exec(att_query)).all()
            
            # Temporary File Location
            filename = f"Attendance_{course.course_code}_{today}.csv"
            filepath = os.path.abspath(f"temp_{filename}")
            
            try:
                with open(filepath, mode='w', newline='') as file:
                    writer = csv.writer(file)
                    writer.writerow(["Student Name", "Admission No", "Time Scanned", "Status"])
                    for record, student in attendance_rows:
                        writer.writerow([
                            student.full_name, 
                            student.admission_number, 
                            record.scan_time.strftime("%H:%M:%S") if record.scan_time else "",
                            record.status
                        ])
                
                # HTML Body
                body = f"""
                <div style="font-family: Arial, sans-serif;">
                    <h2>Attendance Report</h2>
                    <p><strong>Course:</strong> {course.course_name} ({course.course_code})</p>
                    <p><strong>Date:</strong> {today}</p>
                    <p><strong>Total Present:</strong> {len(attendance_rows)}</p>
                    <hr/>
                    <p>Please find the detailed attendance register attached as a CSV file.</p>
                    <p><em>Smart Campus System</em></p>
                </div>
                """
                
                await send_attendance_email(
                    recipients=[lecturer.email],
                    subject=f"Daily Attendance: {course.course_code} - {today}",
                    body=body,
                    attachments=[filepath]
                )
            
            except Exception as e:
                print(f"Error generating report for {course.course_code}: {e}")
            finally:
                # Cleanup
                if os.path.exists(filepath):
                    os.remove(filepath)

async def auto_checkout_users_and_visitors():
    print("Running Auto Checkout Job...")
    now = get_eat_time()
    
    async with AsyncSession(engine) as session:
        # Checkout Users (EntryLog)
        open_logs = (await session.exec(select(EntryLog).where(EntryLog.exit_time == None))).all()
        for log in open_logs:
            log.exit_time = now
            session.add(log)
            
        # Checkout Visitors
        open_visitors = (await session.exec(select(Visitor).where(Visitor.status == "checked_in"))).all()
        for visitor in open_visitors:
            visitor.time_out = now
            visitor.status = "checked_out"
            session.add(visitor)
            
        await session.commit()
        print(f"Auto-checked out {len(open_logs)} users and {len(open_visitors)} visitors.")

async def scrub_expired_sensitive_data():
    print("Running Auto Scrub Sensitive Data Job...")
    from datetime import timedelta
    from sqlmodel import or_, and_
    from app.models import Vehicle
    import os
    
    now = get_eat_time()
    cutoff_time = now - timedelta(hours=24)
    
    async with AsyncSession(engine) as session:
        # Find visitors who requested auto-delete and are checked out or older than 48 hours
        stmt = (
            select(Visitor)
            .where(Visitor.auto_delete_24h == True)
            .where(Visitor.first_name != "Anonymized")
            .where(
                or_(
                    and_(Visitor.status == "checked_out", Visitor.time_out <= cutoff_time),
                    Visitor.time_in <= (now - timedelta(hours=48))
                )
            )
        )
        
        results = await session.exec(stmt)
        expired_visitors = results.all()
        
        scrubbed_count = 0
        for visitor in expired_visitors:
            # 1. Clean files if delivery images are present
            for file_path in [visitor.delivery_image_package, visitor.delivery_image_receipt]:
                if file_path and file_path.startswith("/static/"):
                    local_path = file_path.lstrip("/")
                    if os.path.exists(local_path):
                        try:
                            os.remove(local_path)
                            print(f"Deleted delivery image file: {local_path}")
                        except Exception as file_err:
                            print(f"Error deleting delivery file {local_path}: {file_err}")

            # 2. Anonymize vehicle driver details if they match visitor contact/id
            if visitor.plate_number:
                plate = visitor.plate_number.strip().upper()
                clean_plate = plate.replace(" ", "")
                from sqlalchemy import func
                vehicle = (await session.exec(
                    select(Vehicle).where(func.replace(Vehicle.plate_number, ' ', '') == clean_plate)
                )).first()
                if vehicle:
                    if vehicle.driver_id_number == visitor.id_number or vehicle.driver_contact == visitor.phone_number:
                        vehicle.driver_name = "Anonymized Driver"
                        vehicle.driver_id_number = "Anonymized"
                        vehicle.driver_contact = "Anonymized"
                        session.add(vehicle)

            # 3. Anonymize sensitive visitor fields
            visitor.first_name = "Anonymized"
            visitor.last_name = "Visitor"
            visitor.phone_number = "Anonymized"
            visitor.id_number = "Anonymized"
            visitor.plate_number = "Anonymized"
            visitor.delivery_image_package = None
            visitor.delivery_image_receipt = None
            visitor.dropoff_name = "Anonymized" if visitor.dropoff_name else None
            visitor.dropoff_admission_number = "Anonymized" if visitor.dropoff_admission_number else None
            visitor.visit_details = "Anonymized: Data deleted after 24 hours as requested."
            
            session.add(visitor)
            scrubbed_count += 1
            
        if scrubbed_count > 0:
            await session.commit()
            print(f"Auto-scrubbed {scrubbed_count} visitor entries.")

def start_scheduler():
    # Schedule report at 6:00 PM every day
    try:
        scheduler.add_job(generate_and_send_daily_reports, 'cron', hour=18, minute=0)
        scheduler.add_job(auto_checkout_users_and_visitors, 'cron', hour=0, minute=0)
        scheduler.add_job(scrub_expired_sensitive_data, 'interval', hours=1)
        scheduler.start()
        print("Scheduler Started: Daily Reports at 18:00, Auto Checkout at 00:00, Auto-Scrub hourly")
    except Exception as e:
        print(f"Failed to start scheduler: {e}")
