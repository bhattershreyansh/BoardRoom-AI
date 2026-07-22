import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { AmbientBackground } from "@/components/brand/ambient-background";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BoardRoom AI — AI-Powered Executive Interview Platform" },
      {
        name: "description",
        content:
          "Schedule, run, and evaluate AI-powered voice interviews for CXO-level leadership hiring.",
      },
      {
        property: "og:title",
        content: "BoardRoom AI — AI-Powered Executive Interview Platform",
      },
      {
        property: "og:description",
        content:
          "Enterprise platform for AI-led executive interviews — CEO, CTO, CMO, CFO and COO hires.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <AmbientBackground className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Logo size="sm" />
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/admin">Admin Portal</Link>
          </Button>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-powered executive hiring
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              BoardRoom AI
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Schedule autonomous voice interviews, evaluate CXO candidates against
              role-specific competencies, and deliver structured reports — all in one
              platform.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="group rounded-xl px-8">
                <Link to="/admin">
                  Open Admin Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 grid w-full max-w-4xl gap-4 sm:grid-cols-3"
          >
            {[
              {
                icon: Mic,
                title: "Live voice interviews",
                text: "Candidates join a secure browser session for real-time AI-led conversations.",
              },
              {
                icon: ShieldCheck,
                title: "Executive-grade evaluation",
                text: "Competency scoring and structured reports tailored to each leadership role.",
              },
              {
                icon: Sparkles,
                title: "End-to-end workflow",
                text: "Upload resumes, schedule sessions, and review outcomes from one admin hub.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="glass-card rounded-2xl border border-border bg-card/70 p-6 text-left backdrop-blur-xl"
              >
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-semibold text-foreground">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </motion.div>
        </main>

        <footer className="py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} BoardRoom AI · ElevateTrust
        </footer>
      </div>
    </AmbientBackground>
  );
}
