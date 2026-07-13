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
  overall_confidence: "High" | "Medium" | "Low";
  rehearsed_answers_count: number;
  evasive_answers_count: number;
}

export interface Report {
  session_id?: string;
  candidate_name?: string;
  role_type?: string;
  executive_summary: string;
  overall_signal: OverallSignal;
  recommended_next_step: string;
  competency_notes: CompetencyNote[];
  key_quotes: KeyQuote[];
  key_strengths?: string[];
  key_risks?: string[];
  behavioral_indicators?: BehavioralIndicators;
}
