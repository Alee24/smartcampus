from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database import engine
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.models import ClassSession, AttendanceRecord, User, Course
from app.email_utils import send_attendance_email
from datetime import datetime
import csv
import os

scheduler = AsyncIOScheduler()

async def generate_and_send_daily_reports():
    print("Running Daily Attendance Reporting Job...")
    today = datetime.now().date()
    
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

def start_scheduler():
    # Schedule report at 6:00 PM every day
    try:
        scheduler.add_job(generate_and_send_daily_reports, 'cron', hour=18, minute=0)
        scheduler.start()
        print("Scheduler Started: Daily Reports at 18:00")
    except Exception as e:
        print(f"Failed to start scheduler: {e}")
