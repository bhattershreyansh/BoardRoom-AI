import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  string,
  { label: string; dot: string; text: string; bg: string }
> = {
  completed: {
    label: "Completed",
    dot: "bg-success",
    text: "text-success",
    bg: "bg-success/10 border-success/20",
  },
  scheduled: {
    label: "Scheduled",
    dot: "bg-primary",
    text: "text-primary",
    bg: "bg-primary/10 border-primary/20",
  },
  active: {
    label: "Active",
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning/10 border-warning/20",
  },
  processing: {
    label: "Processing",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-muted/40 border-border",
  },
  failed: {
    label: "Failed",
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive/10 border-destructive/20",
  },
};

export function StatusPill({ status }: { status: string }) {
  const key = String(status).toLowerCase();
  const style = STATUS_STYLES[key] ?? STATUS_STYLES.processing;
  const pulse = key === "processing" || key === "active";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        style.bg,
        style.text,
      )}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              style.dot,
            )}
          />
        )}
        <span
          className={cn("relative inline-flex h-2 w-2 rounded-full", style.dot)}
        />
      </span>
      {style.label}
    </span>
  );
}
