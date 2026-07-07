import { useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { CalendarClock, Loader2, Send, Sparkles } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileDropzone } from "@/components/admin/file-dropzone";
import { useIngestSession, useSessionStatus } from "@/hooks/use-sessions";
import type { RoleType } from "@/lib/types";

const ROLES: { value: RoleType; label: string }[] = [
  { value: "CTO", label: "Chief Technology Officer (CTO)" },
  { value: "CEO", label: "Chief Executive Officer (CEO)" },
  { value: "CMO", label: "Chief Marketing Officer (CMO)" },
];

const schema = z.object({
  candidate_name: z.string().trim().min(2, "Candidate name is required").max(120),
  candidate_email: z.string().trim().email("Enter a valid email").max(255),
  role_type: z.string().min(1, "Select a target role"),
  scheduled_date: z.string().min(1, "Pick a date"),
  scheduled_time: z.string().min(1, "Pick a time"),
});

export function ScheduleForm() {
  const [roleType, setRoleType] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
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
    setRoleType("");
    setName("");
    setEmail("");
    setScheduledDate("");
    setScheduledTime("");
    setResume(null);
    setJdText("");
    setJdFile(null);
    setJdMode("text");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      candidate_name: name,
      candidate_email: email,
      role_type: roleType,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
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
      const combinedDateTime = new Date(`${parsed.data.scheduled_date}T${parsed.data.scheduled_time}:00`);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-2xl p-6 sm:p-7"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            New session
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Schedule New Interview
          </h2>
          <p className="text-sm text-muted-foreground">
            Set up an AI-led executive interview and send the invitation.
          </p>
        </div>
      </div>

      {isProcessing ? (
        <ProcessingState status={String(currentStatus ?? "processing")} />
      ) : isTerminal ? (
        <TerminalState
          status={String(currentStatus)}
          onReset={() => setProcessingId(null)}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Target Role</Label>
              <Select value={roleType} onValueChange={setRoleType}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scheduled-date" className="text-foreground">Scheduled Date</Label>
              <div className="relative group">
                <Input
                  id="scheduled-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  onClick={(e) => "showPicker" in HTMLInputElement.prototype && e.currentTarget.showPicker()}
                  onKeyDown={(e) => e.preventDefault()}
                  className="w-full pl-10 cursor-pointer text-foreground transition-all group-hover:border-primary/40"
                />
                <CalendarClock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-primary/70" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled-time" className="text-foreground">Scheduled Time</Label>
              <div className="relative group">
                <Input
                  id="scheduled-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  onClick={(e) => "showPicker" in HTMLInputElement.prototype && e.currentTarget.showPicker()}
                  onKeyDown={(e) => e.preventDefault()}
                  className="w-full pl-10 cursor-pointer text-foreground transition-all group-hover:border-primary/40"
                />
                <CalendarClock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-primary/70" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Candidate Full Name</Label>
              <Input
                id="name"
                placeholder="Jane Executive"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Candidate Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:bg-accent/10">
            <FileDropzone
              id="resume"
              label="Resume Upload"
              hint="PDF, DOC or DOCX"
              accept=".pdf,.doc,.docx"
              file={resume}
              onFileChange={setResume}
            />
          </div>

          <div className="space-y-2">
            <Label>Job Description</Label>
            <Tabs value={jdMode} onValueChange={(v) => setJdMode(v as "text" | "file")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">Paste text</TabsTrigger>
                <TabsTrigger value="file">Upload file</TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="mt-3">
                <Textarea
                  placeholder="Paste the executive role's job description, mandate, and success criteria…"
                  rows={5}
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />
              </TabsContent>
              <TabsContent value="file" className="mt-3">
                <FileDropzone
                  id="jd-file"
                  label=""
                  hint="PDF, DOC or DOCX"
                  accept=".pdf,.doc,.docx"
                  file={jdFile}
                  onFileChange={setJdFile}
                />
              </TabsContent>
            </Tabs>
          </div>

          <Button
            type="submit"
            variant="default"
            size="lg"
            className="w-full"
            disabled={ingest.isPending}
          >
            {ingest.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scheduling…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Schedule &amp; Send Invitation Email
              </>
            )}
          </Button>
        </form>
      )}
    </motion.div>
  );
}

function ProcessingState({ status }: { status: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="relative grid h-16 w-16 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/15">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </span>
      </div>
      <div>
        <p className="font-semibold text-foreground">Processing session…</p>
        <p className="text-sm text-muted-foreground">
          Parsing resume &amp; JD and preparing the interview. Status:{" "}
          <span className="font-medium text-primary">{status}</span>
        </p>
      </div>
    </div>
  );
}

function TerminalState({
  status,
  onReset,
}: {
  status: string;
  onReset: () => void;
}) {
  const failed = status === "failed";
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div
        className={
          failed
            ? "grid h-14 w-14 place-items-center rounded-full bg-destructive/15 text-destructive"
            : "grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success"
        }
      >
        {failed ? "!" : "✓"}
      </div>
      <div>
        <p className="font-semibold text-foreground">
          {failed ? "Processing failed" : "Session ready"}
        </p>
        <p className="text-sm text-muted-foreground">
          {failed
            ? "Something went wrong while processing. Please try again."
            : "The interview is scheduled and the invitation has been sent."}
        </p>
      </div>
      <Button variant="outline" onClick={onReset}>
        Schedule another
      </Button>
    </div>
  );
}
