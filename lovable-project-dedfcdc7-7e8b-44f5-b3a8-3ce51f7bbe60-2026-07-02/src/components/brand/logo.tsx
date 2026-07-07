import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md";
}

export function Logo({ className, size = "md" }: LogoProps) {
  // We can adjust the height based on size, or keep it responsive.
  const heightClass = size === "sm" ? "h-6" : "h-10";

  return (
    <div className={cn("flex items-center", className)}>
      <img
        src="/image.png"
        alt="Company Logo"
        className={cn("w-auto object-contain", heightClass)}
      />
    </div>
  );
}
