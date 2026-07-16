import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Eye, Inbox, Loader2, RefreshCw, ServerCrash, Trash2, Edit2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { StatusPill } from "@/components/brand/status-pill";
import { useSessions, useDeleteSession, useUpdateSession } from "@/hooks/use-sessions";
import type { Session } from "@/lib/types";

function fmtTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || "—";
  return format(d, "MMM d, yyyy");
}

export function SessionsTable({ filter }: { filter?: "upcoming" | "completed" | "candidates" }) {
  const { data, isLoading, isError, refetch, isFetching } = useSessions();
  const navigate = useNavigate();
  const [editSession, setEditSession] = useState<Session | null>(null);

  let filteredData = data || [];
  if (filter === "upcoming") {
    filteredData = filteredData.filter((s: Session) => s.status !== "completed");
  } else if (filter === "completed") {
    filteredData = filteredData.filter((s: Session) => s.status === "completed");
  } else if (filter === "candidates") {
    // Group by email to get unique candidates
    const uniqueCandidates = new Map<string, Session>();
    filteredData.forEach((s: Session) => {
      if (!uniqueCandidates.has(s.candidate_email)) {
        uniqueCandidates.set(s.candidate_email, s);
      }
    });
    filteredData = Array.from(uniqueCandidates.values());
  }

  return (
    <>
      <div className="space-y-4">
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <EmptyState
            icon={<ServerCrash className="h-6 w-6" />}
            title="Couldn't load data"
            desc="We couldn't reach the backend. Check the server and try again."
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : filteredData.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="No records found"
            desc={filter === "candidates" ? "No candidates available yet." : "Schedule an interview to see it here."}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredData.map((s: Session) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={s.session_id}
                className="group flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:bg-accent/10 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/5 text-lg font-medium text-primary">
                    {s.candidate_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-foreground">
                      {s.candidate_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{s.candidate_email}</p>
                    
                    {filter === "candidates" && s.profile_data?.total_years_experience && (
                      <p className="mt-1 text-xs text-primary/80">
                        {s.profile_data.total_years_experience} years experience
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:justify-end">
                  {filter !== "candidates" && (
                    <div className="hidden flex-col items-end sm:flex">
                      <span className="text-sm font-medium text-foreground">
                        {s.role_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fmtTime(s.scheduled_time)}
                      </span>
                    </div>
                  )}

                  {filter !== "candidates" && (
                    <div className="w-24 shrink-0 text-right">
                      <StatusPill status={String(s.status)} />
                    </div>
                  )}

                  <div className="shrink-0">
                    {filter === "candidates" ? (
                      <Button variant="outline" size="sm" onClick={() => navigate({ to: "/admin/report/$sessionId", params: { sessionId: s.session_id } })}>
                        View Profile
                      </Button>
                    ) : (
                      <RowAction
                        session={s}
                        onView={() => navigate({ to: "/admin/report/$sessionId", params: { sessionId: s.session_id } })}
                        onEdit={() => setEditSession(s)}
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <EditModal session={editSession} onClose={() => setEditSession(null)} />
    </>
  );
}

function RowAction({
  session,
  onView,
  onEdit,
}: {
  session: Session;
  onView: () => void;
  onEdit: () => void;
}) {
  const status = String(session.status).toLowerCase();
  const deleteSession = useDeleteSession();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the scheduled session for ${session.candidate_name}?`)) return;
    setIsDeleting(true);
    try {
      await deleteSession.mutateAsync(session.session_id);
      toast.success("Interview session deleted successfully.");
    } catch {
      toast.error("Failed to delete interview session.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === "completed") {
    return (
      <Button variant="glow" size="sm" onClick={onView}>
        <Eye className="h-4 w-4" />
        View Report
      </Button>
    );
  }
  if (status === "processing" || status === "active") {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {status === "active" ? "In progress" : "Processing"}
      </span>
    );
  }

  // scheduled or failed sessions
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onEdit} 
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
      >
        <Edit2 className="h-3.5 w-3.5" />
        Edit
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleDelete}
        disabled={isDeleting}
        className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        Delete
      </Button>
    </div>
  );
}

interface EditModalProps {
  session: Session | null;
  onClose: () => void;
}

function EditModal({ session, onClose }: EditModalProps) {
  const updateSession = useUpdateSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Parse time and date from ISO when session is loaded
  useState(() => {
    if (session) {
      setName(session.candidate_name);
      setEmail(session.candidate_email);
      if (session.scheduled_time) {
        const d = new Date(session.scheduled_time);
        if (!Number.isNaN(d.getTime())) {
          setDate(d.toISOString().split("T")[0]);
        }
      }
    }
  });

  if (!session) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !date) {
      toast.error("Please fill out all fields.");
      return;
    }

    setIsUpdating(true);
    try {
      const combinedDateTime = new Date(date);
      await updateSession.mutateAsync({
        sessionId: session.session_id,
        payload: {
          candidate_name: name,
          candidate_email: email,
          scheduled_time: combinedDateTime.toISOString(),
        },
      });
      toast.success("Session updated successfully.");
      onClose();
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail ?? "Failed to update session.";
      toast.error(errMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={!!session} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-border/70 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">Edit Session Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Candidate Name</Label>
            <Input 
              id="edit-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              disabled={isUpdating}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Candidate Email</Label>
            <Input 
              id="edit-email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              disabled={isUpdating}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-date" className="text-foreground">Date</Label>
            <div className="relative group">
              <Input 
                id="edit-date" 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                onClick={(e) => "showPicker" in HTMLInputElement.prototype && e.currentTarget.showPicker()}
                onKeyDown={(e) => e.preventDefault()}
                disabled={isUpdating}
                className="w-full pl-10 cursor-pointer text-foreground transition-all group-hover:border-primary/40"
              />
              <CalendarClock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-primary/70" />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="hidden h-6 flex-1 md:block" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="ml-auto h-8 w-28" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary/60 text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{desc}</p>
      </div>
      {action}
    </div>
  );
}
