import os
import uuid
import asyncio
import json
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.config.settings import settings
from core.utils.logger import get_logger
from ingestion.parser import DocumentParser
from ingestion.extractor import ProfileExtractor
from ingestion.models import CandidateProfile
from api.services.token_service import TokenService
from api.database import get_db, SessionLocal
from api.models import InterviewSession
from conductor.models import SessionState

logger = get_logger(__name__)
router = APIRouter(prefix="/api/sessions", tags=["sessions"])

class TokenRequest(BaseModel):
    participant_name: str

async def run_ingestion_task(session_id: str, resume_bytes: bytes, resume_filename: str, jd_text: str):
    """
    Background worker task to parse documents, build the candidate profile, 
    and persist it to the PostgreSQL database.
    """
    temp_resume_path = f"temp_resume_{session_id}_{resume_filename}"
    try:
        # Write bytes to temporary file for the parser to extract
        with open(temp_resume_path, "wb") as f:
            f.write(resume_bytes)
            
        logger.info(f"Extracting resume text for session {session_id}...")
        resume_text = DocumentParser.extract_text(temp_resume_path)
        
        extractor = ProfileExtractor()
        
        logger.info(f"Analyzing Job Description for session {session_id}...")
        jd_config = await extractor.analyze_jd(jd_text)
        
        logger.info(f"Analyzing Resume Snapshot for session {session_id}...")
        resume_snapshot = await extractor.analyze_resume(resume_text)
        
        logger.info(f"Building Candidate Profile configuration for session {session_id}...")
        profile = await extractor.build_candidate_profile(session_id, resume_snapshot, jd_config)
        
        # Determine starting competency based on highest weight
        current_comp = "strategic_vision"
        if profile.jd.competency_weights:
            current_comp = max(profile.jd.competency_weights, key=profile.jd.competency_weights.get)
            
        init_state = SessionState(
            session_id=session_id,
            current_competency=current_comp,
            mandatory_probes_remaining=list(profile.mandatory_probes),
            phase="opening"
        )
        
        # Save profile and initial state to Neon PostgreSQL
        async with SessionLocal() as db:
            stmt = select(InterviewSession).where(InterviewSession.id == uuid.UUID(session_id))
            result = await db.execute(stmt)
            db_session = result.scalar_one_or_none()
            
            if db_session:
                db_session.profile_data = json.loads(profile.model_dump_json())
                db_session.session_state = json.loads(init_state.model_dump_json())
                db_session.status = "scheduled"
                await db.commit()
                logger.info(f"Session {session_id} saved to DB and marked as scheduled.")
                
                # Trigger email invitation asynchronously
                try:
                    from api.services.mail_service import MailService
                    mail_service = MailService()
                    
                    scheduled_str = "Flexible (within 48 hours)"
                    if db_session.scheduled_time:
                        # Format example: Friday, July 03, 2026 at 10:00 AM
                        scheduled_str = db_session.scheduled_time.strftime("%A, %B %d, %Y at %I:%M %p")
                        
                    await mail_service.send_interview_invitation(
                        recipient_name=db_session.candidate_name,
                        recipient_email=db_session.candidate_email,
                        session_id=session_id,
                        role_type=db_session.role_type,
                        scheduled_time_str=scheduled_str
                    )
                except Exception as mail_err:
                    logger.error(f"Failed to dispatch email invitation for session {session_id}: {mail_err}")
            else:
                logger.error(f"Failed to find session {session_id} in DB during ingestion completion.")
                
    except Exception as e:
        logger.error(f"Ingestion pipeline failed for session {session_id}: {e}", exc_info=True)
        async with SessionLocal() as db:
            stmt = select(InterviewSession).where(InterviewSession.id == uuid.UUID(session_id))
            result = await db.execute(stmt)
            db_session = result.scalar_one_or_none()
            if db_session:
                db_session.status = "failed"
                await db.commit()
    finally:
        # Clean up temp file
        if os.path.exists(temp_resume_path):
            os.remove(temp_resume_path)

@router.post("/ingest")
async def ingest_documents(
    background_tasks: BackgroundTasks,
    candidate_name: str = Form("Jane Doe"),
    candidate_email: str = Form("jane@example.com"),
    role_type: str = Form("CTO"),
    scheduled_time: Optional[str] = Form(None),
    resume: UploadFile = File(...),
    jd: Optional[str] = Form(None),
    jd_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Ingests candidate resume and job description. Creates a session in PostgreSQL
    and processes the ingestion in the background.
    """
    if not jd and not jd_file:
        raise HTTPException(status_code=400, detail="Must provide either 'jd' text or 'jd_file'.")
        
    # Validate resume format before any database commits
    resume_ext = os.path.splitext(resume.filename)[1].lower()
    if resume_ext not in [".pdf", ".txt", ".docx"]:
        raise HTTPException(status_code=400, detail=f"Unsupported resume format: {resume_ext}. Only PDF, TXT, and DOCX are supported.")

    session_id = str(uuid.uuid4())

    # Extract & validate JD text immediately if a file is uploaded
    jd_text = ""
    if jd_file:
        jd_ext = os.path.splitext(jd_file.filename)[1].lower()
        if jd_ext not in [".pdf", ".txt", ".docx"]:
            raise HTTPException(status_code=400, detail=f"Unsupported job description format: {jd_ext}. Only PDF, TXT, and DOCX are supported.")
            
        temp_jd_path = f"temp_jd_{session_id}_{jd_file.filename}"
        try:
            with open(temp_jd_path, "wb") as f:
                f.write(await jd_file.read())
            jd_text = DocumentParser.extract_text(temp_jd_path)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to extract text from JD: {str(e)}")
        finally:
            if os.path.exists(temp_jd_path):
                os.remove(temp_jd_path)
    else:
        jd_text = jd
        
    # Validate scheduled time format and timezone awareness
    parsed_scheduled_time = None
    if scheduled_time:
        try:
            parsed_scheduled_time = datetime.fromisoformat(scheduled_time)
            if parsed_scheduled_time.tzinfo is None:
                parsed_scheduled_time = parsed_scheduled_time.replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail="scheduled_time must be in ISO format.")
            
    # Create the session record in PostgreSQL only after all validation succeeds
    new_session = InterviewSession(
        id=uuid.UUID(session_id),
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        role_type=role_type,
        status="processing",
        scheduled_time=parsed_scheduled_time
    )
    db.add(new_session)
    await db.commit()

    resume_bytes = await resume.read()
    
    # Enqueue background task
    background_tasks.add_task(
        run_ingestion_task, 
        session_id, 
        resume_bytes, 
        resume.filename, 
        jd_text
    )
    
    return {
        "session_id": session_id,
        "status": "processing"
    }

@router.get("/{session_id}/status")
async def get_session_status(session_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns the processing status of the ingestion pipeline from DB.
    """
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id UUID.")
        
    stmt = select(InterviewSession).where(InterviewSession.id == session_uuid)
    result = await db.execute(stmt)
    db_session = result.scalar_one_or_none()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    return {
        "session_id": str(db_session.id),
        "status": db_session.status,
        "candidate_name": db_session.candidate_name,
        "candidate_email": db_session.candidate_email
    }

@router.post("/{session_id}/token")
async def generate_room_token(session_id: str, request: TokenRequest, db: AsyncSession = Depends(get_db)):
    """
    Generates a LiveKit token for the candidate to connect to the session.
    """
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id UUID.")
        
    stmt = select(InterviewSession).where(InterviewSession.id == session_uuid)
    result = await db.execute(stmt)
    db_session = result.scalar_one_or_none()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    if not db_session.profile_data:
        raise HTTPException(status_code=400, detail="Cannot join room. Ingestion has not completed.")
        
    if db_session.status == "completed":
        raise HTTPException(status_code=400, detail="Interview has already been completed.")
        
    try:
        # Mark status as active when they retrieve a token to join the room
        if db_session.status == "scheduled":
            db_session.status = "active"
            await db.commit()
            
        token_service = TokenService()
        token = token_service.generate_user_token(
            room_name=session_id,
            participant_identity=request.participant_name,
            participant_name=request.participant_name,
            role="participant"
        )
        return {
            "token": token,
            "url": settings.livekit_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate room token: {str(e)}")

@router.get("/{session_id}/report")
async def get_session_report(session_id: str, db: AsyncSession = Depends(get_db)):
    """
    Retrieves the completed scorecard report.
    """
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id UUID.")
        
    stmt = select(InterviewSession).where(InterviewSession.id == session_uuid)
    result = await db.execute(stmt)
    db_session = result.scalar_one_or_none()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    if not db_session.evaluation_report:
        raise HTTPException(status_code=404, detail="Report not generated yet. The interview may still be active.")
        
    raw_report = db_session.evaluation_report

    # Format competency notes and scale 1-5 scores to 0-100 for progress bars
    competency_notes = []
    for comp_key, note_text in raw_report.get("competency_notes", {}).items():
        score_item = raw_report.get("scorecard", {}).get(comp_key)
        avg_score = score_item.get("average_score") if score_item else 0.0
        scaled_score = int((avg_score / 5.0) * 100)
        
        competency_notes.append({
            "competency": comp_key.replace("_", " ").title(),
            "score": scaled_score,
            "note": note_text
        })

    # Format key quotes
    key_quotes = []
    for comp_key, quote_text in raw_report.get("key_quotes", {}).items():
        key_quotes.append({
            "quote": quote_text,
            "context": comp_key.replace("_", " ").title()
        })

    # Map backend overall signal ("strong" | "mixed" | "weak") to frontend values
    raw_signal = raw_report.get("overall_signal", "mixed").lower()
    signal_map = {
        "strong": "strong_hire",
        "mixed": "lean_hire",
        "weak": "no_hire"
    }
    overall_signal = signal_map.get(raw_signal, "lean_hire")

    return {
        "session_id": str(db_session.id),
        "candidate_name": db_session.candidate_name,
        "role_type": db_session.role_type,
        "executive_summary": raw_report.get("executive_summary", ""),
        "overall_signal": overall_signal,
        "recommended_next_step": raw_report.get("recommended_next_step", "hold"),
        "competency_notes": competency_notes,
        "key_quotes": key_quotes
    }

@router.get("")
async def list_all_sessions(db: AsyncSession = Depends(get_db)):
    """
    Lists all scheduled and completed sessions.
    """
    stmt = select(InterviewSession).order_by(InterviewSession.created_at.desc())
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    return [
        {
            "session_id": str(s.id),
            "candidate_name": s.candidate_name,
            "candidate_email": s.candidate_email,
            "role_type": s.role_type,
            "status": s.status,
            "scheduled_time": s.scheduled_time.isoformat() if s.scheduled_time else None,
            "created_at": s.created_at.isoformat() if s.created_at else None
        }
        for s in sessions
    ]

class UpdateSessionRequest(BaseModel):
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    scheduled_time: Optional[str] = None # ISO format

@router.patch("/{session_id}")
async def update_session(session_id: str, request: UpdateSessionRequest, db: AsyncSession = Depends(get_db)):
    """
    Updates the upcoming session metadata.
    Time Guard: Rejects updates if the scheduled interview time has already reached.
    """
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id UUID.")
        
    stmt = select(InterviewSession).where(InterviewSession.id == session_uuid)
    result = await db.execute(stmt)
    db_session = result.scalar_one_or_none()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    # Time Guard: check if current time has passed the scheduled interview time
    now = datetime.now(timezone.utc)
    if db_session.scheduled_time:
        sched = db_session.scheduled_time
        if sched.tzinfo is None:
            sched = sched.replace(tzinfo=timezone.utc)
        if now >= sched:
            raise HTTPException(status_code=400, detail="Cannot update session after the scheduled interview time has reached.")
            
    # Apply updates
    if request.candidate_name is not None:
        db_session.candidate_name = request.candidate_name
    if request.candidate_email is not None:
        db_session.candidate_email = request.candidate_email
    if request.scheduled_time is not None:
        try:
            parsed_time = datetime.fromisoformat(request.scheduled_time)
            if parsed_time.tzinfo is None:
                parsed_time = parsed_time.replace(tzinfo=timezone.utc)
            db_session.scheduled_time = parsed_time
        except ValueError:
            raise HTTPException(status_code=400, detail="scheduled_time must be in ISO format.")
            
    await db.commit()
    return {
        "session_id": str(db_session.id),
        "status": db_session.status,
        "candidate_name": db_session.candidate_name,
        "candidate_email": db_session.candidate_email,
        "scheduled_time": db_session.scheduled_time.isoformat() if db_session.scheduled_time else None
    }

@router.delete("/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """
    Deletes an upcoming, completed, or failed session. Active sessions cannot be deleted.
    """
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id UUID.")
        
    stmt = select(InterviewSession).where(InterviewSession.id == session_uuid)
    result = await db.execute(stmt)
    db_session = result.scalar_one_or_none()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    if db_session.status == "active":
        raise HTTPException(status_code=400, detail="Cannot delete an active interview session.")
        
    await db.delete(db_session)
    await db.commit()
    return {"message": "Session deleted successfully."}
