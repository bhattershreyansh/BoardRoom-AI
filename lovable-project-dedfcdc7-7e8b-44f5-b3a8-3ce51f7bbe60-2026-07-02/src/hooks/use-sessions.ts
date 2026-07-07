import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  checkHealth,
  createToken,
  getReport,
  getSessionStatus,
  ingestSession,
  listSessions,
  deleteSession,
  updateSession,
  type IngestPayload,
  type UpdatePayload,
} from "@/lib/api";

const ACTIVE_STATUSES = ["processing", "active", "scheduled"];

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
    refetchInterval: 20000,
    retry: false,
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.some((s) => ACTIVE_STATUSES.includes(String(s.status)))) {
        return 3000;
      }
      return 15000;
    },
  });
}

export function useIngestSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: IngestPayload) => ingestSession(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

/** Poll status every 3s until completed/failed. */
export function useSessionStatus(sessionId: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["session-status", sessionId],
    queryFn: () => getSessionStatus(sessionId as string),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const status = String(query.state.data?.status ?? "");
      if (status === "completed" || status === "failed") {
        qc.invalidateQueries({ queryKey: ["sessions"] });
        return false;
      }
      return 3000;
    },
  });
}

export function useReport(sessionId: string | null) {
  return useQuery({
    queryKey: ["report", sessionId],
    queryFn: () => getReport(sessionId as string),
    enabled: !!sessionId,
  });
}

export function useCreateToken() {
  return useMutation({
    mutationFn: ({
      sessionId,
      participantName,
    }: {
      sessionId: string;
      participantName: string;
    }) => createToken(sessionId, participantName),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: UpdatePayload;
    }) => updateSession(sessionId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}
