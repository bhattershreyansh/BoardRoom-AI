from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional

# Resume Parser

class CareerEntry(BaseModel):
    company: str
    title: str
    start_year: int
    end_year: int | None                
    duration_months: int
    description: str                   

class TenureGap(BaseModel):
    between: tuple[str, str]            
    gap_months: int

class ResumeSnapshot(BaseModel):
    full_name: str
    current_title: str
    career_arc: list[CareerEntry]       
    total_years_experience: int
    domains: list[str]                  
    seniority_level: str                
    tenure_gaps: list[TenureGap]        
    board_exposure: bool
    notable_signals: list[str]          
    red_flags: list[str]                

# JD Analyzer

class JDConfig(BaseModel):
    role_type: str                      
    company_stage: str                  
    mandate: str                        
    competency_weights: dict[str, float]  # 0.0–1.0 Standard competency keys:
    # strategic_vision, operational_execution, stakeholder_management,
    # people_leadership, financial_acumen, communication, self_awareness
    mandatory_probes: list[str]         
    red_flag_triggers: list[str]        
    interview_tone: str          
    expected_duration_minutes: int     

# Candidate Profile Builder

class Hypothesis(BaseModel):
    area: str                           # competency key
    hypothesis: str                     # e.g. "Candidate claims P&L ownership but resume shows VP role only"
    probe_instruction: str              # e.g. "Ask for the exact P&L size and who they reported to"
    priority: int                       # 1 = must test, 2 = should test, 3 = nice to have

class AnchorQuestion(BaseModel):
    question: str                       
    target_competency: str
    resume_reference: str 

class GeneratedProfileData(BaseModel):
    hypothesis_map: list[Hypothesis]
    anchor_questions: list[AnchorQuestion]  
    mandatory_probes: list[str]              
    red_flags: list[str]

class CandidateProfile(GeneratedProfileData):
    session_id: str
    candidate: ResumeSnapshot
    jd: JDConfig              