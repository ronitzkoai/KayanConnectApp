import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ContractorSidebar } from "./ContractorSidebar";
import { FloatingChatWidget } from "./FloatingChatWidget";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Briefcase, Settings, MessageCircle, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractorLayoutProps {
  children: ReactNode;
}

export function ContractorLayout({ children }: ContractorLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const mobileNavItems = [
    { icon: Home, label: "ראשי", path: "/contractor" },
    { icon: Briefcase, label: "קריאות", path: "/contractor/jobs" },
    { icon: Wrench, label: "תחזוקה", path: "/contractor/maintenance" },
    { icon: MessageCircle, label: "הודעות", path: "/chat" },
    { icon: Settings, label: "הגדרות", path: "/contractor/settings" },
  ];

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen w-full bg-stone-50 overflow-hidden" dir="rtl">
        <div className="flex w-full h-full">
          {/* Desktop Sidebar */}
          <ContractorSidebar />
          
          <main className="flex-1 flex flex-col w-full h-full overflow-hidden">
            {/* Minimal Header - Desktop Only */}
            <header className="hidden md:flex flex-shrink-0 h-14 border-b border-stone-200 bg-white/80 backdrop-blur-sm items-center px-4 gap-3">
              <SidebarTrigger className="shrink-0 hover:bg-stone-100 rounded-lg p-2 transition-all" />
              <h1 className="text-sm font-semibold text-stone-700">מערכת ניהול עבודות</h1>
            </header>

            {/* Main content - subtract mobile nav height on mobile (h-16 + safe area) */}
            <div className="flex-1 min-h-0 h-[calc(100%-6rem)] md:h-full">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50 shadow-lg pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5 h-16">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 transition-colors",
                    isActive
                      ? "text-stone-900"
                      : "text-stone-400 hover:text-stone-600"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Floating Chat Widget */}
        <FloatingChatWidget />
      </div>
    </SidebarProvider>
  );
}
