import { createFileRoute, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Brain,
  CheckCircle2,
  CheckSquare,
  FileText,
  Gauge,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AmbientBackground } from "@/components/brand/ambient-background";
import { cn } from "@/lib/utils";
import { useReport } from "@/hooks/use-sessions";
import type { CompetencyNote, OverallSignal } from "@/lib/types";

export const Route = createFileRoute("/admin_/report/$sessionId")({
  head: () => ({
    meta: [
      { title: "Evaluation Report — BoardRoom AI" },
      { name: "description", content: "AI-generated evaluation report for the executive interview session." },
    ],
  }),
  component: ReportPage,
});

const SIGNAL_META: Record<string, { label: string; className: string }> = {
  strong_hire: { label: "Strong Hire", className: "text-success bg-success/12 border-success/25" },
  hire: { label: "Hire", className: "text-success bg-success/12 border-success/25" },
  lean_hire: { label: "Lean Hire", className: "text-primary bg-primary/12 border-primary/25" },
  lean_no_hire: { label: "Lean No Hire", className: "text-warning bg-warning/12 border-warning/25" },
  no_hire: { label: "No Hire", className: "text-destructive bg-destructive/12 border-destructive/25" },
};

function signalMeta(signal: OverallSignal) {
  return (
    SIGNAL_META[String(signal).toLowerCase()] ?? {
      label: String(signal).replace(/_/g, " "),
      className: "text-primary bg-primary/12 border-primary/25",
    }
  );
}

function ReportPage() {
  const { sessionId } = Route.useParams();
  const router = useRouter();
  const { data: report, isLoading, isError } = useReport(sessionId);

  return (
    <AmbientBackground className="min-h-screen">
      {/* Sticky header with back button */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Button
            id="report-back-btn"
            variant="ghost"
            size="sm"
            onClick={() => router.history.back()}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Evaluation Report</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <ReportSkeleton />
        ) : isError || !report ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-24 text-center"
          >
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Report unavailable</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                We couldn't load the evaluation report for this session.
              </p>
            </div>
            <Button variant="outline" onClick={() => router.history.back()} className="gap-2 mt-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* ── Top summary cards ── */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Award className="h-3.5 w-3.5" /> Overall Signal
                </div>
                <span className={cn("inline-flex rounded-xl border px-4 py-2 text-sm font-bold capitalize", signalMeta(report.overall_signal).className)}>
                  {signalMeta(report.overall_signal).label}
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <ArrowRight className="h-3.5 w-3.5" /> Recommended Action
                </div>
                <p className="text-sm font-semibold text-foreground capitalize">{report.recommended_next_step}</p>
              </div>

              <div className="rounded-2xl border border-primary/25 bg-primary/6 p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                  <Gauge className="h-3.5 w-3.5" /> Hiring Confidence
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${report.hiring_confidence_score}%` }}
                      transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500"
                    />
                  </div>
                  <span className="text-lg font-bold tabular-nums text-foreground shrink-0">
                    {report.hiring_confidence_score}%
                  </span>
                </div>
              </div>
            </div>

            {/* ── Executive Summary & Hiring Decision ── */}
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-primary" /> Executive Summary
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{report.executive_summary}</p>
              </section>

              <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                  <Award className="h-4 w-4" /> Hiring Decision Logic & Next Step
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground mb-2">{report.detailed_recommendation}</p>
                {report.hiring_confidence_reasoning && (
                  <p className="text-xs italic leading-relaxed text-muted-foreground border-t border-border/40 pt-2 mt-2">
                    <span className="font-semibold not-italic">Confidence reasoning: </span>
                    {report.hiring_confidence_reasoning}
                  </p>
                )}
              </section>
            </div>

            {/* ── Key Strengths ── */}
            {report.key_strengths?.length > 0 && (
              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" /> Key Strengths
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {report.key_strengths.map((s, i) => (
                    <div key={i} className="rounded-2xl border border-success/20 bg-success/5 p-5">
                      <h4 className="mb-1.5 font-semibold text-sm text-foreground">{s.name}</h4>
                      <p className="text-xs leading-relaxed text-muted-foreground mb-3">{s.explanation}</p>
                      {s.evidence && (
                        <blockquote className="border-l-2 border-success/40 pl-3 text-xs italic text-foreground/80 bg-success/10 py-2 rounded-r-lg">
                          "{s.evidence}"
                        </blockquote>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Risks & Concerns ── */}
            {report.key_risks?.length > 0 && (
              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Risks & Concerns
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {report.key_risks.map((r, i) => {
                    const isHigh = String(r.severity).toLowerCase() === "high";
                    const isMed = String(r.severity).toLowerCase() === "medium";
                    const badgeColor = isHigh
                      ? "text-destructive border-destructive/30 bg-destructive/10"
                      : isMed
                      ? "text-warning border-warning/30 bg-warning/10"
                      : "text-success border-success/30 bg-success/10";
                    return (
                      <div key={i} className="rounded-2xl border border-destructive/15 bg-destructive/5 p-5">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm text-foreground">{r.name}</h4>
                          <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0", badgeColor)}>
                            {r.severity}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground mb-3">{r.reason}</p>
                        {r.evidence && (
                          <blockquote className="border-l-2 border-destructive/40 pl-3 text-xs italic text-foreground/80 bg-destructive/10 py-2 rounded-r-lg">
                            "{r.evidence}"
                          </blockquote>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Behavioral Indicators ── */}
            {report.behavioral_indicators && (
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Brain className="h-4 w-4 text-primary" /> Behavioral & Integrity Indicators
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {Object.entries(report.behavioral_indicators).map(([key, val]) => {
                    const rating = Number(val) || 0;
                    return (
                      <div key={key} className="rounded-xl border border-border/40 bg-muted/20 p-4">
                        <span className="block mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {key.replace(/_/g, " ")}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={cn("text-xl leading-none select-none", i < rating ? "text-amber-500" : "text-muted-foreground/20")}>
                              ★
                            </span>
                          ))}
                          <span className="ml-2 text-xs text-muted-foreground">{rating}/5</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Observations & Next Round Topics ── */}
            <div className="grid gap-4 sm:grid-cols-2">
              {report.interviewer_observations?.length > 0 && (
                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Brain className="h-4 w-4 text-primary" /> Interviewer Observations
                  </h3>
                  <ul className="space-y-2.5">
                    {report.interviewer_observations.map((o, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                        {o}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {report.recommended_topics?.length > 0 && (
                <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
                    <CheckSquare className="h-4 w-4" /> Next Round Target Topics
                  </h3>
                  <ul className="space-y-2.5">
                    {report.recommended_topics.map((t, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* ── Competency Decision Matrix ── */}
            {report.scorecard_details?.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm overflow-hidden">
                <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Gauge className="h-4 w-4 text-primary" /> Competency Decision Matrix
                </h3>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground font-semibold uppercase tracking-wider">
                        <th className="py-3 pr-4 text-left">Competency</th>
                        <th className="py-3 px-4 text-center">Turns</th>
                        <th className="py-3 px-4 text-center">Grade</th>
                        <th className="py-3 px-4 text-center">Framework</th>
                        <th className="py-3 px-4 text-center">Example</th>
                        <th className="py-3 px-4 text-center">Metrics</th>
                        <th className="py-3 pl-4 text-center">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/25">
                      {report.scorecard_details.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 pr-4 font-semibold text-foreground">{item.competency}</td>
                          <td className="py-3.5 px-4 text-center font-medium tabular-nums text-muted-foreground">{item.turns_count}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                              {item.grade}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-muted-foreground capitalize">{String(item.strategic_framework).toLowerCase()}</td>
                          <td className="py-3.5 px-4 text-center text-muted-foreground capitalize">{String(item.real_example).toLowerCase()}</td>
                          <td className="py-3.5 px-4 text-center text-muted-foreground capitalize">{String(item.metrics).toLowerCase()}</td>
                          <td className="py-3.5 pl-4 text-center">
                            <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold border capitalize",
                              String(item.confidence).toLowerCase() === "high"
                                ? "text-success border-success/30 bg-success/8"
                                : String(item.confidence).toLowerCase() === "medium"
                                ? "text-primary border-primary/30 bg-primary/8"
                                : "text-warning border-warning/30 bg-warning/8"
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

            {/* ── Competency Assessment Notes ── */}
            {report.competency_notes?.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Gauge className="h-4 w-4 text-primary" /> Competency Assessment Notes
                </h3>
                <div className="space-y-5">
                  {report.competency_notes.map((c, i) => (
                    <CompetencyBar key={i} note={c} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Bottom back button */}
            <div className="flex justify-start pb-4">
              <Button
                variant="outline"
                onClick={() => router.history.back()}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </AmbientBackground>
  );
}

function CompetencyBar({ note, index }: { note: CompetencyNote; index: number }) {
  const score = Math.max(0, Math.min(100, Number(note.score) || 0));
  const tone = score >= 75 ? "bg-success" : score >= 50 ? "bg-primary" : "bg-warning";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">{note.competency}</span>
        <span className="text-sm font-bold tabular-nums text-muted-foreground">
          {score}<span className="text-xs font-normal">/100</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, delay: index * 0.07, ease: "easeOut" }}
          className={cn("h-full rounded-full", tone)}
        />
      </div>
      {note.note && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{note.note}</p>
      )}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6 pt-2">
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading evaluation report…
      </div>
    </div>
  );
}
