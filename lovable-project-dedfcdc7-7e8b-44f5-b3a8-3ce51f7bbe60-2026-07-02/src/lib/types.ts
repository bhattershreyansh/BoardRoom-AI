// Shared domain types for BoardRoom AI.

export type RoleType = "CTO" | "CEO" | "CMO" | "CFO" | "COO";

export type SessionStatus =
  | "processing"
  | "scheduled"
  | "active"
  | "completed"
  | "failed";

export interface Session {
  session_id: string;
  candidate_name: string;
  candidate_email: string;
  role_type: RoleType | string;
  scheduled_time: string;
  status: SessionStatus | string;
}

export interface IngestResponse {
  session_id: string;
  status: SessionStatus | string;
}

export interface StatusResponse {
  session_id?: string;
  status: SessionStatus | string;
}

export interface TokenResponse {
  token: string;
  url?: string;
}

export interface CompetencyNote {
  competency: string;
  score: number; // 0-100
  note?: string;
}

export interface KeyQuote {
  quote: string;
  context?: string;
}

export type OverallSignal =
  | "strong_hire"
  | "hire"
  | "lean_hire"
  | "no_hire"
  | "lean_no_hire"
  | string;

export interface BehavioralIndicators {
  communication: number;
  executive_presence: number;
  confidence_under_pressure: number;
  strategic_thinking: number;
  ownership: number;
  decision_making: number;
  influencing: number;
}

export interface StrengthItem {
  name: string;
  explanation: string;
  evidence: string;
}

export interface RiskItem {
  name: string;
  severity: "high" | "medium" | "low" | string;
  reason: string;
  evidence: string;
}

export interface ScorecardDetail {
  competency: string;
  score: number;
  grade: string;
  turns_count: number;
  strategic_framework: string;
  real_example: string;
  metrics: string;
  confidence: string;
}

export interface Report {
  session_id?: string;
  candidate_name?: string;
  role_type?: string;
  executive_summary: string;
  overall_signal: OverallSignal;
  recommended_next_step: string;
  competency_notes: CompetencyNote[];
  key_strengths: StrengthItem[];
  key_risks: RiskItem[];
  behavioral_indicators: BehavioralIndicators;
  hiring_confidence_score: number;
  hiring_confidence_reasoning: string;
  detailed_recommendation: string;
  recommended_topics: string[];
  interviewer_observations: string[];
  scorecard_details: ScorecardDetail[];
}
