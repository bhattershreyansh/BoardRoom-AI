import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  FileText,
  Gauge,
  Loader2,
  CheckCircle2,
  Brain,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useReport } from "@/hooks/use-sessions";
import type { CompetencyNote, OverallSignal } from "@/lib/types";

const SIGNAL_META: Record<string, { label: string; className: string }> = {
  strong_hire: { label: "Strong Hire", className: "text-success bg-success/12 border-success/25" },
  hire: { label: "Hire", className: "text-success bg-success/12 border-success/25" },
  lean_hire: { label: "Lean Hire", className: "text-primary bg-primary/12 border-primary/25" },
  lean_no_hire: {
    label: "Lean No Hire",
    className: "text-warning bg-warning/12 border-warning/25",
  },
  no_hire: {
    label: "No Hire",
    className: "text-destructive bg-destructive/12 border-destructive/25",
  },
};

function signalMeta(signal: OverallSignal) {
  return (
    SIGNAL_META[String(signal).toLowerCase()] ?? {
      label: String(signal).replace(/_/g, " "),
      className: "text-primary bg-primary/12 border-primary/25",
    }
  );
}

export function ReportModal({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  const { data: report, isLoading, isError } = useReport(sessionId);

  return (
    <Dialog open={!!sessionId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border/70 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            Evaluation Report
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <ReportSkeleton />
        ) : isError || !report ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/12 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="font-semibold text-foreground">Report unavailable</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              We couldn't load the evaluation report for this session.
            </p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Signal + recommendation */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Award className="h-3.5 w-3.5" /> Overall Signal
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-lg border px-3 py-1.5 text-sm font-semibold capitalize",
                    signalMeta(report.overall_signal).className,
                  )}
                >
                  {signalMeta(report.overall_signal).label}
                </span>
              </div>
              <div className="rounded-xl border border-primary/25 bg-primary/8 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
                  <ArrowRight className="h-3.5 w-3.5" /> Recommended Next Step
                </div>
                <p className="text-sm font-medium text-foreground">
                  {report.recommended_next_step}
                </p>
              </div>
            </div>

            {/* Executive summary */}
            <section className="rounded-xl border border-border/60 bg-secondary/20 p-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4 text-primary" /> Executive Summary
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {report.executive_summary}
              </p>
            </section>

            {/* Strengths & Risks */}
            <div className="grid gap-4 sm:grid-cols-2">
              {report.key_strengths && report.key_strengths.length > 0 && (
                <section className="rounded-xl border border-success/30 bg-success/5 p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-success">
                    <CheckCircle2 className="h-4 w-4" /> Key Strengths
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {report.key_strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {report.key_risks && report.key_risks.length > 0 && (
                <section className="rounded-xl border border-destructive/25 bg-destructive/5 p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Risks & Concerns
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {report.key_risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Behavioral Indicators */}
            {report.behavioral_indicators && (
              <section className="rounded-xl border border-border/60 bg-secondary/10 p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Brain className="h-4 w-4 text-primary" /> Behavioral & Integrity Indicators
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-border/40 bg-card p-4">
                    <div className="text-xs font-medium text-muted-foreground uppercase">Speaking Confidence</div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      {report.behavioral_indicators.overall_confidence}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-card p-4">
                    <div className="text-xs font-medium text-muted-foreground uppercase">Rehearsed Responses</div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      {report.behavioral_indicators.rehearsed_answers_count} flagged
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-card p-4">
                    <div className="text-xs font-medium text-muted-foreground uppercase">Evasive Answers</div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      {report.behavioral_indicators.evasive_answers_count} flagged
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Competencies */}
            {report.competency_notes?.length > 0 && (
              <section className="rounded-xl border border-border/60 bg-secondary/20 p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Gauge className="h-4 w-4 text-primary" /> Competency Assessment
                </h3>
                <div className="space-y-4">
                  {report.competency_notes.map((c, i) => (
                    <CompetencyBar key={i} note={c} index={i} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CompetencyBar({ note, index }: { note: CompetencyNote; index: number }) {
  const score = Math.max(0, Math.min(100, Number(note.score) || 0));
  const tone =
    score >= 75 ? "bg-success" : score >= 50 ? "bg-primary" : "bg-warning";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{note.competency}</span>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
          {score}
          <span className="text-xs">/100</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, delay: index * 0.08, ease: "easeOut" }}
          className={cn("h-full rounded-full", tone)}
        />
      </div>
      {note.note && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {note.note}
        </p>
      )}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4 py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
      <div className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
      </div>
    </div>
  );
}
