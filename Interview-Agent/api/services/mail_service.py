import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
from core.config.settings import settings
from core.utils.logger import get_logger

logger = get_logger(__name__)

class MailService:
    def __init__(self):
        self.host = settings.smtp_host
        self.port = settings.smtp_port
        self.username = settings.smtp_username
        self.password = settings.smtp_password
        self.sender = settings.smtp_sender

    def _send_mail_sync(self, recipient: str, subject: str, html_content: str):
        """Sends email using standard smtplib synchronously."""
        if not self.username or not self.password:
            logger.warning("SMTP credentials are not fully configured in .env. Skipping real mail dispatch.")
            logger.info("======================================================================")
            logger.info(f"📧 [Mock Mailer] Outgoing Email dispatched to: {recipient}")
            logger.info(f"📧 [Mock Mailer] Subject: {subject}")
            logger.info(f"📧 [Mock Mailer] Join Link: {settings.frontend_url}/interview")
            logger.info("======================================================================")
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.sender
        msg["To"] = recipient

        part = MIMEText(html_content, "html")
        msg.attach(part)

        try:
            # TLS port (587) or SSL port (465)
            if self.port == 465:
                server = smtplib.SMTP_SSL(self.host, self.port)
            else:
                server = smtplib.SMTP(self.host, self.port)
                server.starttls()
            
            server.login(self.username, self.password)
            server.sendmail(self.sender, [recipient], msg.as_string())
            server.quit()
            logger.info(f"Successfully sent invitation email to {recipient} via {self.host}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {e}", exc_info=True)

    async def send_interview_invitation(
        self, 
        recipient_name: str, 
        recipient_email: str, 
        session_id: str, 
        role_type: str, 
        scheduled_time_str: str
    ):
        """Asynchronously dispatches the interview invitation email."""
        interview_link = f"{settings.frontend_url}/interview/{session_id}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #0b0f19; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">BoardRoom AI Interview Invitation</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #dddddd; border-radius: 0 0 8px 8px; border-top: none;">
                <p>Hello <strong>{recipient_name}</strong>,</p>
                <p>You have been scheduled for an AI-led technical interview for the <strong>{role_type}</strong> position.</p>
                
                <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3182ce;">
                    <p style="margin: 0 0 10px 0;"><strong>Scheduled Time:</strong> {scheduled_time_str}</p>
                    <p style="margin: 0;"><strong>Format:</strong> Voice-to-Voice AI Interview (approx. 45 minutes)</p>
                </div>
                
                <p>When you are ready to begin at your scheduled time, please click the button below to join the session:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{interview_link}" style="background-color: #3182ce; color: #ffffff; padding: 12px 24px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; border-radius: 6px; font-weight: bold;">Join Interview Room</a>
                </div>
                
                <p style="font-size: 12px; color: #718096;">If the button above does not work, copy and paste this URL into your browser:<br/>
                <a href="{interview_link}" style="color: #3182ce;">{interview_link}</a></p>
                
                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;"/>
                <p style="font-size: 14px;">Best regards,<br/>BoardRoom AI Talent Acquisition Team</p>
            </div>
        </body>
        </html>
        """
        subject = f"Interview Scheduled: {role_type} Role - BoardRoom AI"
        
        # Offload the synchronous smtplib work to an event loop thread pool
        await asyncio.to_thread(self._send_mail_sync, recipient_email, subject, html_content)
