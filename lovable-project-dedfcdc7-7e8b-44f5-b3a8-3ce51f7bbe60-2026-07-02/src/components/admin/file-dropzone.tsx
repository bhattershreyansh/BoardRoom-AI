import { useCallback, useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept: string;
  label: string;
  hint: string;
  id: string;
}

export function FileDropzone({
  file,
  onFileChange,
  accept,
  label,
  hint,
  id,
}: FileDropzoneProps) {
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
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      {file ? (
        <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center transition-all",
            dragging
              ? "border-primary bg-primary/10"
              : "border-border bg-secondary/20 hover:border-primary/50 hover:bg-secondary/40",
          )}
        >
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/12 text-primary">
            <UploadCloud className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Drag & drop or <span className="text-primary">browse</span>
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </button>
      )}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
