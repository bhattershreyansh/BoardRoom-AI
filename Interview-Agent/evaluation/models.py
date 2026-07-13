from typing import List, Dict
from pydantic import BaseModel

class CompetencyScorecardItem(BaseModel):
    average_score: float
    grade: str                         # "Exceptional" | "Strong" | "Adequate" | "Weak" | "Poor"
    candidate_turns_count: int

class BehavioralIndicators(BaseModel):
    overall_confidence: str            # "High" | "Medium" | "Low"
    rehearsed_answers_count: int
    evasive_answers_count: int

class QualitativeAssessment(BaseModel):
    overall_signal: str                # "strong" | "mixed" | "weak"
    executive_summary: str             # One-paragraph summary of performance
    competency_notes: Dict[str, str]   # competency_key -> assessor note explaining the score
    key_strengths: List[str]           # High-level strengths of the candidate
    key_risks: List[str]               # Strategic concerns or key risks identified
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
    key_strengths: List[str]
    key_risks: List[str]
    behavioral_indicators: BehavioralIndicators
    full_transcript: List[Dict[str, str]]