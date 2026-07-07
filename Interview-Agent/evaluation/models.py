from typing import List, Dict
from pydantic import BaseModel

class CompetencyScorecardItem(BaseModel):
    average_score: float
    grade: str                         # "Exceptional" | "Strong" | "Adequate" | "Weak" | "Poor"
    candidate_turns_count: int

class QualitativeAssessment(BaseModel):
    overall_signal: str                # "strong" | "mixed" | "weak"
    executive_summary: str             # One-paragraph summary of performance
    competency_notes: Dict[str, str]   # competency_key -> assessor note explaining the score
    key_quotes: Dict[str, str]         # competency_key -> verbatim quote from candidate
    recommended_next_step: str         # "progress" | "hold" | "reject"

class FinalEvaluationReport(BaseModel):
    session_id: str
    candidate_name: str
    role_type: str
    overall_signal: str
    executive_summary: str
    recommended_next_step: str
    scorecard: Dict[str, CompetencyScorecardItem]
    competency_notes: Dict[str, str]
    key_quotes: Dict[str, str]
    full_transcript: List[Dict[str, str]]