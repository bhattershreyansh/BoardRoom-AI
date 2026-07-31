import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ShieldCheck, Lock, ArrowRight, Menu, X } from "lucide-react";
import { AmbientBackground } from "@/components/brand/ambient-background";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ScheduleForm } from "@/components/admin/schedule-form";
import { SessionsTable } from "@/components/admin/sessions-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "BoardRoom AI" },
      {
        name: "description",
        content:
          "Schedule AI-powered executive interviews and review evaluation reports for CXO-level candidates.",
      },
      { property: "og:title", content: "BoardRoom AI" },
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
  
  const [activeTab, setActiveTab] = useState(() => 
    typeof window !== 'undefined' ? sessionStorage.getItem("admin_active_tab") || "dashboard" : "dashboard"
  );
  const [interviewsTab, setInterviewsTab] = useState(() => 
    typeof window !== 'undefined' ? sessionStorage.getItem("admin_interviews_tab") || "upcoming" : "upcoming"
  );
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("demo_auth") === "true") {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  useEffect(() => {
    sessionStorage.setItem("admin_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem("admin_interviews_tab", interviewsTab);
  }, [interviewsTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem("demo_auth", "true");
    setIsAuthenticated(true);
  };

  if (isChecking) return null;

  if (!isAuthenticated) {
    return (
      <AmbientBackground className="flex min-h-screen items-center justify-center p-4">
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
      {/* Header with mobile menu toggle */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/40 backdrop-blur-3xl">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              id="mobile-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden rounded-xl p-2 text-muted-foreground hover:bg-secondary transition-colors"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <AdminHeader />
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-64 lg:hidden"
            >
              <AdminSidebar
                activeTab={activeTab}
                setActiveTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-h-[calc(100vh-4rem)] w-full">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:left-0 lg:top-16 lg:h-[calc(100vh-4rem)] lg:z-20">
          <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        <main className="flex-1 min-w-0 px-4 py-6 sm:py-8 lg:ml-64 lg:px-8 xl:px-10">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full"
          >
            {/* ── Dashboard: Full-screen Schedule Form ── */}
            {activeTab === "dashboard" && (
              <div className="w-full">
                <div className="mb-6 sm:mb-8">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
                    Schedule Interview
                  </h1>
                  <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
                    Set up a new AI-led executive interview and send out the invitations.
                  </p>
                </div>
                <ScheduleForm fullScreen />
              </div>
            )}

            {/* ── Interviews: Toggle upcoming / completed ── */}
            {activeTab === "interviews" && (
              <div className="w-full">
                <div className="mb-6 sm:mb-8">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
                    Interviews
                  </h1>
                  <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
                    Manage upcoming interviews and review completed evaluation reports.
                  </p>
                </div>
                <Tabs value={interviewsTab} onValueChange={setInterviewsTab} className="w-full">
                  <TabsList className="mb-6 w-full sm:w-auto">
                    <TabsTrigger value="upcoming" className="flex-1 sm:flex-none">Upcoming</TabsTrigger>
                    <TabsTrigger value="completed" className="flex-1 sm:flex-none">Completed</TabsTrigger>
                    <TabsTrigger value="expired" className="flex-1 sm:flex-none">Expired</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upcoming">
                    <SessionsTable filter="upcoming" />
                  </TabsContent>
                  <TabsContent value="completed">
                    <SessionsTable filter="completed" />
                  </TabsContent>
                  <TabsContent value="expired">
                    <SessionsTable filter="expired" />
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* ── Candidates ── */}
            {activeTab === "candidates" && (
              <div className="w-full">
                <div className="mb-6 sm:mb-8">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
                    Candidate Directory
                  </h1>
                  <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
                    View candidate profiles extracted from resumes.
                  </p>
                </div>
                <SessionsTable filter="candidates" />
              </div>
            )}

            {/* ── Settings ── */}
            {activeTab === "settings" && (
              <div className="w-full">
                <div className="mb-6 sm:mb-8">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
                    Settings
                  </h1>
                  <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
                    Manage your account and preferences.
                  </p>
                </div>
                
                <div className="space-y-6">
                  <div className="glass-card rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-xl">
                    <h2 className="mb-4 text-lg font-medium text-foreground">Account Security</h2>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Sign Out</p>
                        <p className="text-sm text-muted-foreground">Log out of your current session.</p>
                      </div>
                      <Button 
                        variant="destructive" 
                        onClick={() => {
                          sessionStorage.removeItem("demo_auth");
                          setIsAuthenticated(false);
                          setActiveTab("dashboard");
                        }}
                      >
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </AmbientBackground>
  );
}
