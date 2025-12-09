import { ReactNode } from "react";
import { TechnicianSidebar } from "./TechnicianSidebar";
import { Home, Wrench, Users, User, Settings, MessageCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TechnicianLayoutProps {
  children: ReactNode;
}

export const TechnicianLayout = ({ children }: TechnicianLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const mobileNavItems = [
    { icon: Home, label: "ראשי", path: "/technician" },
    { icon: Wrench, label: "קריאות", path: "/technician/requests" },
    { icon: Users, label: "קבלנים", path: "/technician/contractors" },
    { icon: MessageCircle, label: "צ׳אט", path: "/chat" },
    { icon: User, label: "פרופיל", path: "/technician/profile" },
  ];

  return (
    <div className="h-screen bg-background flex w-full overflow-hidden">
      {/* Desktop Sidebar */}
      <TechnicianSidebar />

      {/* Main Content - subtract mobile nav height on mobile (h-16 + safe area) */}
      <div className="flex-1 flex flex-col min-h-0 h-[calc(100%-6rem)] md:h-full">
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== "/technician" && location.pathname.startsWith(item.path));
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 transition-colors relative",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
