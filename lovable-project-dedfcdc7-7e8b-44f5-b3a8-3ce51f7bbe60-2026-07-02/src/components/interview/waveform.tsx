import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WaveformProps {
  active: boolean;
  speaker: "ai" | "candidate" | "idle";
}

const BARS = 40;

export function Waveform({ active, speaker }: WaveformProps) {
  const color =
    speaker === "ai"
      ? "bg-primary"
      : speaker === "candidate"
        ? "bg-accent"
        : "bg-muted-foreground/40";

  return (
    <div className="flex h-32 items-center justify-center gap-[3px]">
      {Array.from({ length: BARS }).map((_, i) => {
        const distance = Math.abs(i - BARS / 2);
        const base = 1 - distance / (BARS / 2);
        return (
          <motion.span
            key={i}
            className={cn("w-[3px] rounded-full sm:w-[4px]", color)}
            animate={
              active
                ? {
                    height: [
                      `${8 + base * 12}px`,
                      `${20 + base * 80}px`,
                      `${12 + base * 24}px`,
                    ],
                  }
                : { height: `${6 + base * 8}px` }
            }
            transition={
              active
                ? {
                    duration: 0.7 + (i % 5) * 0.12,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                    delay: i * 0.02,
                  }
                : { duration: 0.3 }
            }
          />
        );
      })}
    </div>
  );
}
