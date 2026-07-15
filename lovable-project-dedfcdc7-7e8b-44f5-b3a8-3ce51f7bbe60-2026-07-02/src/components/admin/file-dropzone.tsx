import { useCallback, useRef, useState } from "react";
import { FileText, Upload, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept: string;
  label: string;
  hint: string;
  id: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({ file, onFileChange, accept, label, hint, id }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) onFileChange(dropped);
    },
    [onFileChange],
  );

  return (
    <div className="w-full">
      {label && <p className="mb-2 text-sm font-medium text-foreground">{label}</p>}

      {file ? (
        /* ── File attached state ── */
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3.5 transition-all">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/15">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* ── Drop zone ── */
        <button
          type="button"
          id={id}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200",
            dragging
              ? "border-primary bg-primary/8 scale-[1.01]"
              : "border-border bg-card hover:border-primary/50 hover:bg-accent/10",
          )}
        >
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-200",
            dragging
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-border bg-muted text-muted-foreground group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary"
          )}>
            <Upload className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              Drop file here or{" "}
              <span className="text-primary underline underline-offset-2">browse</span>
            </p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        id={`input-${id}`}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
