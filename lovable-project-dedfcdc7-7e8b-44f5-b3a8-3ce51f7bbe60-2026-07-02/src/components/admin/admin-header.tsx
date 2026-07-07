import { motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useHealth } from "@/hooks/use-sessions";

export function AdminHeader() {
  const { data: online, isLoading } = useHealth();

  const state = isLoading
    ? { label: "Checking…", dot: "bg-muted-foreground", ring: "bg-muted-foreground/20" }
    : online
      ? { label: "Backend connected", dot: "bg-success", ring: "bg-success/20" }
      : { label: "Backend unavailable", dot: "bg-destructive", ring: "bg-destructive/20" };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/40 backdrop-blur-3xl">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-center gap-2.5 rounded-full border border-border bg-card/60 px-4 py-1.5 backdrop-blur-xl shadow-lg",
          )}
        >
          <span className="relative flex h-2.5 w-2.5">
            {!isLoading && (
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                  state.dot,
                )}
              />
            )}
            <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", state.dot)} />
          </span>
          <span className="text-xs font-medium text-muted-foreground">{state.label}</span>
        </motion.div>
      </div>
    </header>
  );
}
