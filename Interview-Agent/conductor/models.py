from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class Turn(BaseModel):
    turn_id: int
    speaker: str                        # "interviewer" | "candidate"
    text: str
    timestamp: float                    # Epoch timestamp or session relative seconds

class TurnScore(BaseModel):
    turn_id: int                        # Maps to the candidate's turn_id
    competency: str                     # The competency being evaluated
    scores: Dict[str, int]              # signal -> 1-5 (specificity, consequence, self_awareness, relevance, depth)
    composite: float                    # Average of the signal scores
    probe_needed: bool                  # True if composite < threshold (default 3.0)
    rationale: Optional[str] = None     # Optional explanation from the scorer
    confidence: Optional[str] = "medium" # Scorer confidence: "high", "medium", "low"
    is_rehearsed: Optional[bool] = False # True if candidate seems rehearsed/memorized

class SessionState(BaseModel):
    # Session Metadata
    session_id: str
    
    # Active Conversation Transcript
    full_transcript: List[Turn] = Field(default_factory=list)
    
    # Background Evaluation Scores
    turn_scores: List[TurnScore] = Field(default_factory=list)
    
    # Conductor Agenda Tracking
    current_competency: str
    competencies_covered: List[str] = Field(default_factory=list)
    mandatory_probes_remaining: List[str] = Field(default_factory=list)
    phase: str = "opening"              # "opening" | "probing" | "closing"
    
    # State Machine Guards (Updated by probe_logic, read by the Brain)
    offtopic_turns: int = 0             # Consecutive off-topic turns
    follow_ups_this_turn: int = 0       # Number of follow-ups on the current competency/turn

class RawScorerOutput(BaseModel):
    scores: Dict[str, int]  # keys: specificity, consequence, self_awareness, relevance, depth
    rationale: str
    confidence: str
    is_rehearsed: bool

