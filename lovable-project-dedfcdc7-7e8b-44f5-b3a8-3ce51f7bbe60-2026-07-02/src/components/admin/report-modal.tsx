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
  CheckSquare,
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
            {/* Signal + recommendation + confidence meter */}
            <div className="grid gap-4 sm:grid-cols-3">
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
              <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <ArrowRight className="h-3.5 w-3.5" /> Recommended Action
                </div>
                <p className="text-sm font-medium text-foreground capitalize">
                  {report.recommended_next_step}
                </p>
              </div>
              <div className="rounded-xl border border-primary/25 bg-primary/8 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
                  <Award className="h-3.5 w-3.5" /> Hiring Confidence
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${report.hiring_confidence_score}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500"
                    />
                  </div>
                  <span className="text-sm font-bold text-foreground tabular-nums shrink-0">
                    {report.hiring_confidence_score}%
                  </span>
                </div>
              </div>
            </div>

            {/* Executive summary & next step guidance */}
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="rounded-xl border border-border/60 bg-secondary/20 p-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-primary" /> Executive Summary
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {report.executive_summary}
                </p>
              </section>

              <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                  <Award className="h-4 w-4" /> Hiring Decision Logic & Next Step
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground mb-2">
                  {report.detailed_recommendation}
                </p>
                {report.hiring_confidence_reasoning && (
                  <p className="text-xs text-muted-foreground italic leading-relaxed border-t border-border/40 pt-2 mt-2">
                    **Confidence reasoning**: {report.hiring_confidence_reasoning}
                  </p>
                )}
              </section>
            </div>

            {/* Key Strengths */}
            {report.key_strengths && report.key_strengths.length > 0 && (
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" /> Key Strengths
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.key_strengths.map((s, i) => (
                    <div key={i} className="rounded-xl border border-success/20 bg-success/5 p-4 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-sm text-foreground mb-1">{s.name}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{s.explanation}</p>
                      </div>
                      {s.evidence && (
                        <blockquote className="border-l-2 border-success/40 pl-2.5 text-xs italic text-foreground bg-success/10 py-1.5 rounded-r">
                          "{s.evidence}"
                        </blockquote>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Risks & Concerns */}
            {report.key_risks && report.key_risks.length > 0 && (
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Risks & Concerns
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.key_risks.map((r, i) => {
                    const isHigh = String(r.severity).toLowerCase() === "high";
                    const isMed = String(r.severity).toLowerCase() === "medium";
                    const badgeColor = isHigh
                      ? "text-destructive border-destructive/30 bg-destructive/10"
                      : isMed
                      ? "text-warning border-warning/30 bg-warning/10"
                      : "text-success border-success/30 bg-success/10";
                    return (
                      <div key={i} className="rounded-xl border border-destructive/15 bg-destructive/5 p-4 flex flex-col justify-between">
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-sm text-foreground">{r.name}</h4>
                            <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border shrink-0", badgeColor)}>
                              {r.severity}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{r.reason}</p>
                        </div>
                        {r.evidence && (
                          <blockquote className="border-l-2 border-destructive/40 pl-2.5 text-xs italic text-foreground bg-destructive/10 py-1.5 rounded-r">
                            "{r.evidence}"
                          </blockquote>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Behavioral Indicators */}
            {report.behavioral_indicators && (
              <section className="rounded-xl border border-border/60 bg-secondary/10 p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Brain className="h-4 w-4 text-primary" /> Behavioral & Integrity Indicators
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {Object.entries(report.behavioral_indicators).map(([key, val]) => {
                    const rating = Number(val) || 0;
                    return (
                      <div key={key} className="rounded-lg border border-border/40 bg-card p-3 flex flex-col justify-between gap-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground capitalize">
                          {key.replace(/_/g, " ")}
                        </span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={cn(
                                "text-lg leading-none select-none",
                                i < rating ? "text-amber-500 font-bold" : "text-muted/20"
                              )}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Observations & Next Round Topics */}
            <div className="grid gap-4 sm:grid-cols-2">
              {report.interviewer_observations && report.interviewer_observations.length > 0 && (
                <section className="rounded-xl border border-border/60 bg-secondary/15 p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Brain className="h-4 w-4 text-primary" /> Interviewer Observations
                  </h3>
                  <ul className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                    {report.interviewer_observations.map((o, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {report.recommended_topics && report.recommended_topics.length > 0 && (
                <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                    <CheckSquare className="h-4 w-4" /> Next Round Target Topics
                  </h3>
                  <ul className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                    {report.recommended_topics.map((t, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Decision Matrix Table */}
            {report.scorecard_details && report.scorecard_details.length > 0 && (
              <section className="rounded-xl border border-border/60 bg-secondary/20 p-5 overflow-hidden">
                <h3 className="mb-3.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Gauge className="h-4 w-4 text-primary" /> Competency Decision Matrix
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground font-medium uppercase tracking-wider">
                        <th className="py-2.5 pr-4 text-left">Competency</th>
                        <th className="py-2.5 px-4 text-center">Turns</th>
                        <th className="py-2.5 px-4 text-center">Grade</th>
                        <th className="py-2.5 px-4 text-center">Framework</th>
                        <th className="py-2.5 px-4 text-center">Example</th>
                        <th className="py-2.5 px-4 text-center">Metrics</th>
                        <th className="py-2.5 pl-4 text-center">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/25">
                      {report.scorecard_details.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/10 transition-colors text-foreground">
                          <td className="py-3 pr-4 font-semibold text-left">{item.competency}</td>
                          <td className="py-3 px-4 text-center font-medium tabular-nums">{item.turns_count}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                              {item.grade}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-muted-foreground capitalize">{String(item.strategic_framework).toLowerCase()}</td>
                          <td className="py-3 px-4 text-center text-muted-foreground capitalize">{String(item.real_example).toLowerCase()}</td>
                          <td className="py-3 px-4 text-center text-muted-foreground capitalize">{String(item.metrics).toLowerCase()}</td>
                          <td className="py-3 pl-4 text-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-semibold border capitalize",
                              String(item.confidence).toLowerCase() === "high"
                                ? "text-success border-success/30 bg-success/5"
                                : String(item.confidence).toLowerCase() === "medium"
                                ? "text-primary border-primary/30 bg-primary/5"
                                : "text-warning border-warning/30 bg-warning/5"
                            )}>
                              {item.confidence}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Competency notes details */}
            {report.competency_notes?.length > 0 && (
              <section className="rounded-xl border border-border/60 bg-secondary/20 p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Gauge className="h-4 w-4 text-primary" /> Competency Assessment Notes
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
