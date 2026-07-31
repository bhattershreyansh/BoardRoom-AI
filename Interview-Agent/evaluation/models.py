from typing import List, Dict
from pydantic import BaseModel

class CompetencyScorecardItem(BaseModel):
    average_score: float
    grade: str                         # "Exceptional" | "Strong" | "Adequate" | "Weak" | "Poor"
    candidate_turns_count: int
    strategic_framework: str = "Moderate" # "Exceptional" | "Strong" | "Moderate" | "Weak" | "Poor"
    real_example: str = "Moderate"        # "Exceptional" | "Strong" | "Moderate" | "Weak" | "Poor"
    metrics: str = "Moderate"             # "Exceptional" | "Strong" | "Moderate" | "Weak" | "Poor"
    confidence: str = "Medium"            # "High" | "Medium" | "Low"

class BehavioralIndicators(BaseModel):
    communication: int                 # 1 to 5 stars
    executive_presence: int            # 1 to 5 stars
    confidence_under_pressure: int     # 1 to 5 stars
    strategic_thinking: int            # 1 to 5 stars
    ownership: int                     # 1 to 5 stars
    decision_making: int               # 1 to 5 stars
    influencing: int                   # 1 to 5 stars

class StrengthItem(BaseModel):
    name: str
    explanation: str
    evidence: str                      # Verbatim candidate quote snippet

class RiskItem(BaseModel):
    name: str
    severity: str                      # "high" | "medium" | "low"
    reason: str                        # Explanation of why it's a risk and its severity
    evidence: str                      # Verbatim candidate quote snippet or description of lack thereof

class QualitativeAssessment(BaseModel):
    overall_signal: str                # "strong" | "mixed" | "weak"
    executive_summary: str             # One-paragraph summary of performance
    competency_notes: Dict[str, str]   # competency_key -> assessor note explaining the score
    key_strengths: List[StrengthItem]
    key_risks: List[RiskItem]
    recommended_next_step: str         # "progress" | "hold" | "reject"
    hiring_confidence_score: int       # 0 to 100
    hiring_confidence_reasoning: str
    detailed_recommendation: str       # Actionable recruiter recommendation
    recommended_topics: List[str]      # Recommended topics to probe in the next round
    interviewer_observations: List[str] # General recruiter observation bullet points
    behavioral_indicators: BehavioralIndicators # Graded traits
    scorecard_details: Dict[str, Dict[str, str]] # competency_key -> sub-component grading mapping

class FinalEvaluationReport(BaseModel):
    session_id: str
    candidate_name: str
    role_type: str
    overall_signal: str
    executive_summary: str
    recommended_next_step: str
    scorecard: Dict[str, CompetencyScorecardItem]
    competency_notes: Dict[str, str]
    key_strengths: List[StrengthItem]
    key_risks: List[RiskItem]
    behavioral_indicators: BehavioralIndicators
    hiring_confidence_score: int
    hiring_confidence_reasoning: str
    detailed_recommendation: str
    recommended_topics: List[str]
    interviewer_observations: List[str]
    full_transcript: List[Dict[str, str]]