import { Logo } from "@/components/brand/logo";

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/40 backdrop-blur-3xl">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
      </div>
    </header>
  );
}
