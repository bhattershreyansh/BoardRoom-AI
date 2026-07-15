import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, UserSquare2, Settings } from "lucide-react";

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function AdminSidebar({ activeTab, setActiveTab }: AdminSidebarProps) {
  const links = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "interviews", label: "Interviews", icon: Users },
    { id: "candidates", label: "Candidates", icon: UserSquare2 },
  ];

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar p-5">
      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              id={`sidebar-${link.id}`}
              onClick={() => setActiveTab(link.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <link.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive
                    ? "text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground"
                )}
              />
              {link.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-border/50">
        <button
          id="sidebar-settings"
          onClick={() => setActiveTab("settings")}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
            activeTab === "settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings
            className={cn(
              "h-5 w-5 shrink-0",
              activeTab === "settings"
                ? "text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground"
            )}
          />
          Settings
        </button>
      </div>
    </aside>
  );
}
