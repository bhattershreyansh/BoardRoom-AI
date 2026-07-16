import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Mail,
  Send,
  Sparkles,
  User,
  XCircle,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDropzone } from "@/components/admin/file-dropzone";
import { useIngestSession, useSessionStatus } from "@/hooks/use-sessions";
import type { RoleType } from "@/lib/types";

const ROLES: { value: RoleType; label: string; desc: string }[] = [
  { value: "CTO", label: "Chief Technology Officer", desc: "Engineering & Technology leadership" },
  { value: "CEO", label: "Chief Executive Officer", desc: "Corporate strategy & operations" },
  { value: "CMO", label: "Chief Marketing Officer", desc: "Marketing & brand leadership" },
];

const schema = z.object({
  candidate_name: z.string().trim().min(2, "Candidate name is required").max(120),
  candidate_email: z.string().trim().email("Enter a valid email").max(255),
  role_type: z.string().min(1, "Select a target role"),
  scheduled_date: z.string().min(1, "Pick a date"),
});

function StepBadge({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
        {number}
      </div>
      <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function ScheduleForm({ fullScreen = false }: { fullScreen?: boolean }) {
  const [roleType, setRoleType] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [jdMode, setJdMode] = useState<"text" | "file">("text");
  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const ingest = useIngestSession();
  const { data: statusData } = useSessionStatus(processingId);
  const currentStatus = statusData?.status;
  const isTerminal = currentStatus === "completed" || currentStatus === "failed";
  const isProcessing = !!processingId && !isTerminal;

  const reset = () => {
    setRoleType(""); setName(""); setEmail(""); setScheduledDate("");
    setResume(null); setJdText(""); setJdFile(null); setJdMode("text");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      candidate_name: name,
      candidate_email: email,
      role_type: roleType,
      scheduled_date: scheduledDate,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    if (jdMode === "text" && jdText.trim().length === 0 && !jdFile) {
      toast.error("Provide a job description or upload a JD file");
      return;
    }
    if (jdMode === "file" && !jdFile && jdText.trim().length === 0) {
      toast.error("Upload a JD file or switch to text");
      return;
    }
    try {
      const combinedDateTime = new Date(parsed.data.scheduled_date);
      const res = await ingest.mutateAsync({
        candidate_name: parsed.data.candidate_name,
        candidate_email: parsed.data.candidate_email,
        role_type: parsed.data.role_type,
        scheduled_time: combinedDateTime.toISOString(),
        resume,
        jd: jdMode === "text" ? jdText : undefined,
        jd_file: jdMode === "file" ? jdFile : undefined,
      });
      setProcessingId(res.session_id);
      toast.success("Interview scheduled — invitation is being processed");
      reset();
    } catch {
      toast.error("Failed to schedule interview. Is the backend running?");
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* ─── Step 1: Role & Date ─── */}
      <section>
        <StepBadge number={1} label="Position & Timing" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Role picker as cards */}
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-sm font-medium text-foreground">Target Role</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  id={`role-${r.value}`}
                  onClick={() => setRoleType(r.value)}
                  className={`group relative flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all duration-200 ${
                    roleType === r.value
                      ? "border-primary bg-primary/8 shadow-sm ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40 hover:bg-accent/20"
                  }`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    roleType === r.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  }`}>
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <span className={`text-sm font-semibold leading-tight ${roleType === r.value ? "text-primary" : "text-foreground"}`}>
                    {r.label}
                  </span>
                  <span className="text-xs text-muted-foreground leading-snug">{r.desc}</span>
                  {roleType === r.value && (
                    <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Scheduled date */}
          <div className="space-y-2">
            <Label htmlFor="scheduled-date" className="text-sm font-medium text-foreground">
              Interview Date
            </Label>
            <div className="relative group">
              <CalendarDays className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="scheduled-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                onClick={(e) => "showPicker" in HTMLInputElement.prototype && e.currentTarget.showPicker()}
                onKeyDown={(e) => e.preventDefault()}
                className="pl-10 cursor-pointer transition-all hover:border-primary/40 focus:border-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Step 2: Candidate Info ─── */}
      <section>
        <StepBadge number={2} label="Candidate Details" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
            <div className="relative group">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="name"
                placeholder="Jane Executive"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 transition-all hover:border-primary/40 focus:border-primary"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">Email Address</Label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="email"
                type="email"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 transition-all hover:border-primary/40 focus:border-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Step 3: Documents ─── */}
      <section>
        <StepBadge number={3} label="Supporting Documents" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Resume */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Candidate Resume</Label>
            <FileDropzone
              id="resume"
              label=""
              hint="PDF, DOC or DOCX — max 10 MB"
              accept=".pdf,.doc,.docx"
              file={resume}
              onFileChange={setResume}
            />
          </div>

          {/* JD */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Job Description</Label>
            <div className="flex rounded-xl overflow-hidden border border-border bg-muted/30 mb-3">
              <button
                type="button"
                onClick={() => setJdMode("text")}
                className={`flex-1 py-2 text-xs font-semibold transition-all ${
                  jdMode === "text"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => setJdMode("file")}
                className={`flex-1 py-2 text-xs font-semibold transition-all ${
                  jdMode === "file"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Upload File
              </button>
            </div>
            <AnimatePresence mode="wait">
              {jdMode === "text" ? (
                <motion.div
                  key="text"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <Textarea
                    placeholder="Paste the executive role's job description, mandate, and success criteria…"
                    rows={fullScreen ? 7 : 5}
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    className="resize-none transition-all hover:border-primary/40 focus:border-primary"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <FileDropzone
                    id="jd-file"
                    label=""
                    hint="PDF, DOC or DOCX — max 10 MB"
                    accept=".pdf,.doc,.docx"
                    file={jdFile}
                    onFileChange={setJdFile}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ─── Submit ─── */}
      <div className="pt-2 border-t border-border">
        <Button
          id="schedule-submit"
          type="submit"
          size="lg"
          className="w-full gap-2 rounded-xl py-6 text-base font-semibold shadow-md transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
          disabled={ingest.isPending}
        >
          {ingest.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Scheduling Interview…
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Schedule & Send Invitation
              <ChevronRight className="h-4 w-4 opacity-70" />
            </>
          )}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          An invitation email will be automatically sent to the candidate.
        </p>
      </div>
    </form>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={fullScreen ? "w-full" : "glass-card rounded-2xl p-6 sm:p-7"}
    >
      {!fullScreen && (
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">Schedule New Interview</h2>
            <p className="text-sm text-muted-foreground">Set up an AI-led executive interview.</p>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {isProcessing ? (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ProcessingState status={String(currentStatus ?? "processing")} />
          </motion.div>
        ) : isTerminal ? (
          <motion.div key="terminal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TerminalState status={String(currentStatus)} onReset={() => setProcessingId(null)} />
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {formContent}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProcessingState({ status }: { status: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="relative grid h-20 w-20 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
        <span className="absolute inset-2 animate-ping rounded-full bg-primary/10 animation-delay-150" />
        <span className="grid h-20 w-20 place-items-center rounded-full bg-primary/10 border border-primary/20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold text-foreground">Processing Session</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Parsing resume & JD and preparing your interview. This may take a moment.
        </p>
        <span className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          {status}
        </span>
      </div>
    </div>
  );
}

function TerminalState({ status, onReset }: { status: string; onReset: () => void }) {
  const failed = status === "failed";
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className={`grid h-20 w-20 place-items-center rounded-full border-2 ${
        failed ? "border-destructive/30 bg-destructive/10" : "border-success/30 bg-success/10"
      }`}>
        {failed
          ? <XCircle className="h-10 w-10 text-destructive" />
          : <CheckCircle2 className="h-10 w-10 text-success" />
        }
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold text-foreground">
          {failed ? "Processing Failed" : "Interview Scheduled!"}
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {failed
            ? "Something went wrong while processing. Please try again."
            : "The interview session is ready and the invitation email has been sent."}
        </p>
      </div>
      <Button variant="outline" onClick={onReset} className="gap-2">
        <Sparkles className="h-4 w-4" />
        Schedule Another Interview
      </Button>
    </div>
  );
}
