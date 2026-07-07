import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ShieldCheck, Lock, ArrowRight } from "lucide-react";
import { AmbientBackground } from "@/components/brand/ambient-background";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ScheduleForm } from "@/components/admin/schedule-form";
import { SessionsTable } from "@/components/admin/sessions-table";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — BoardRoom AI" },
      {
        name: "description",
        content:
          "Schedule AI-powered executive interviews and review evaluation reports for CXO-level candidates.",
      },
      { property: "og:title", content: "Admin Dashboard — BoardRoom AI" },
      {
        property: "og:description",
        content:
          "Schedule AI-powered executive interviews and review evaluation reports for CXO-level candidates.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (sessionStorage.getItem("demo_auth") === "true") {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem("demo_auth", "true");
    setIsAuthenticated(true);
  };

  if (isChecking) return null;

  if (!isAuthenticated) {
    return (
      <AmbientBackground className="flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="glass-card relative overflow-hidden rounded-3xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
            <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-primary/20 blur-[60px]" />
            <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-accent/20 blur-[60px]" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 border border-primary/20 shadow-sm">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Admin Portal</h1>
              <p className="mb-8 text-sm text-muted-foreground">
                Sign in to manage executive interviews.
              </p>

              <form onSubmit={handleLogin} className="w-full space-y-4">
                <div className="space-y-3">
                  <input 
                    type="email" 
                    required
                    placeholder="Work Email" 
                    className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <input 
                    type="password" 
                    required
                    placeholder="Password" 
                    className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                
                <Button type="submit" size="lg" className="group mt-2 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                  Secure Sign In
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </form>
              
              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                <span>Enterprise SSO Enabled</span>
              </div>
            </div>
          </div>
        </motion.div>
      </AmbientBackground>
    );
  }

  return (
    <AmbientBackground>
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-4rem)] w-full">
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 px-4 py-8 lg:ml-64 lg:px-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-auto max-w-6xl"
          >
            {activeTab === "dashboard" && (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Upcoming Interviews
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    Manage and schedule upcoming executive interviews.
                  </p>
                </div>

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
                  <SessionsTable filter="upcoming" />
                  
                  <div className="sticky top-24">
                    <h2 className="mb-4 text-xl font-semibold text-foreground">Quick Schedule</h2>
                    <ScheduleForm />
                  </div>
                </div>
              </>
            )}

            {activeTab === "interviews" && (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Completed Interviews
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    Review post-interview evaluation reports and scores.
                  </p>
                </div>
                <div className="max-w-4xl">
                  <SessionsTable filter="completed" />
                </div>
              </>
            )}

            {activeTab === "candidates" && (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Candidate Directory
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    View candidate profiles extracted from resumes.
                  </p>
                </div>
                <div className="max-w-4xl">
                  <SessionsTable filter="candidates" />
                </div>
              </>
            )}
            {activeTab === "settings" && (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card">
                <p className="text-muted-foreground">This section is under construction.</p>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </AmbientBackground>
  );
}
