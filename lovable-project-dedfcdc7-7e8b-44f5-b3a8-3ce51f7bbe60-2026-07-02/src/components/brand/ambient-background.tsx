import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AmbientBackground({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("relative min-h-screen", className)}>
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -left-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[26rem] w-[26rem] translate-x-1/3 translate-y-1/3 rounded-full bg-primary/10 blur-[120px]" />
      </div>
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
