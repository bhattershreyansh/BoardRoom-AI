import axios from "axios";
import type {
  IngestResponse,
  Report,
  Session,
  StatusResponse,
  TokenResponse,
} from "./types";

export const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ??
  "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
});

export interface IngestPayload {
  candidate_name: string;
  candidate_email: string;
  role_type: string;
  scheduled_time: string;
  resume?: File | null;
  jd?: string;
  jd_file?: File | null;
}

/** Health check for the FastAPI backend. Tries /health then falls back to root. */
export async function checkHealth(): Promise<boolean> {
  try {
    await apiClient.get("/health", { timeout: 6000 });
    return true;
  } catch {
    try {
      await apiClient.get("/", { timeout: 6000 });
      return true;
    } catch {
      return false;
    }
  }
}

/** POST /api/sessions/ingest — multipart/form-data */
export async function ingestSession(
  payload: IngestPayload,
): Promise<IngestResponse> {
  const form = new FormData();
  form.append("candidate_name", payload.candidate_name);
  form.append("candidate_email", payload.candidate_email);
  form.append("role_type", payload.role_type);
  form.append("scheduled_time", payload.scheduled_time);
  if (payload.resume) form.append("resume", payload.resume);
  if (payload.jd && payload.jd.trim().length > 0) form.append("jd", payload.jd);
  if (payload.jd_file) form.append("jd_file", payload.jd_file);

  const { data } = await apiClient.post<IngestResponse>(
    "/api/sessions/ingest",
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

/** GET /api/sessions/{session_id}/status */
export async function getSessionStatus(
  sessionId: string,
): Promise<StatusResponse> {
  const { data } = await apiClient.get<StatusResponse>(
    `/api/sessions/${sessionId}/status`,
  );
  return data;
}

/** GET /api/sessions */
export async function listSessions(): Promise<Session[]> {
  const { data } = await apiClient.get<Session[] | { sessions: Session[] }>(
    "/api/sessions",
  );
  if (Array.isArray(data)) return data;
  return data.sessions ?? [];
}

/** POST /api/sessions/{session_id}/token */
export async function createToken(
  sessionId: string,
  participantName: string,
): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>(
    `/api/sessions/${sessionId}/token`,
    { participant_name: participantName },
  );
  return data;
}

/** GET /api/sessions/{session_id}/report */
export async function getReport(sessionId: string): Promise<Report> {
  const { data } = await apiClient.get<Report>(
    `/api/sessions/${sessionId}/report`,
  );
  return data;
}

/** DELETE /api/sessions/{session_id} */
export async function deleteSession(sessionId: string): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(
    `/api/sessions/${sessionId}`
  );
  return data;
}

export interface UpdatePayload {
  candidate_name?: string;
  candidate_email?: string;
  scheduled_time?: string;
}

/** PATCH /api/sessions/{session_id} */
export async function updateSession(
  sessionId: string,
  payload: UpdatePayload,
): Promise<Session> {
  const { data } = await apiClient.patch<Session>(
    `/api/sessions/${sessionId}`,
    payload,
  );
  return data;
}
