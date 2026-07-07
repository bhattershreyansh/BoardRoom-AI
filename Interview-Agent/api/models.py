from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from api.database import Base
import uuid

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_name = Column(String, nullable=False)
    candidate_email = Column(String, nullable=False)
    role_type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="scheduled")
    scheduled_time = Column(DateTime(timezone=True), nullable=True)
    profile_data = Column(JSONB, nullable=True)       # CandidateProfile Pydantic representation
    session_state = Column(JSONB, nullable=True)      # SessionState Pydantic representation
    evaluation_report = Column(JSONB, nullable=True)  # FinalEvaluationReport Pydantic representation
    created_at = Column(DateTime(timezone=True), server_default=func.now())
