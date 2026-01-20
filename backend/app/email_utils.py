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
