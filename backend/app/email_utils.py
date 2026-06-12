from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr, BaseModel
from typing import List, Optional
import os

# Default Config - Environment Variables should override
conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM = os.getenv("MAIL_FROM", "admin@gatepass.com"),
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

async def send_attendance_email(
    recipients: List[str],
    subject: str,
    body: str,
    attachments: Optional[List[str]] = None
):
    print(f"Preparing to send email to {recipients}...")
    
    if not os.getenv("MAIL_USERNAME"):
        print(f"MOCK EMAIL: To {recipients}\nSubject: {subject}\nAttachments: {attachments}")
        return

    message = MessageSchema(
        subject=subject,
        recipients=recipients,
        body=body,
        subtype=MessageType.html,
        attachments=attachments 
    )

    fm = FastMail(conf)
    
    try:
        await fm.send_message(message)
        print(f"Email sent successfully to {recipients}")
    except Exception as e:
        print(f"Error sending email: {e}")

async def send_notification_email(
    email: str,
    subject: str,
    title: str,
    message: str
):
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #7A1975; margin: 0; font-size: 24px;">Smart Campus System</h1>
            <p style="color: #718096; margin: 4px 0 0 0; font-size: 14px;">Instant Gateway Notification</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />
        <h3 style="color: #2d3748; margin-top: 0; margin-bottom: 12px;">{title}</h3>
        <div style="color: #4a5568; line-height: 1.6; font-size: 15px;">
            {message}
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;" />
        <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">
            This is an automated safety notification from the Smart Campus Gateway Pass System.<br/>
            Please do not reply directly to this email.
        </p>
    </div>
    """
    await send_attendance_email(recipients=[email], subject=subject, body=body)

