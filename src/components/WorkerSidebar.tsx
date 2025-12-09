import { Home, FileText, Briefcase, User, Star, Settings, LogOut, MessageCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/lib/supabase-context";
import { useEffect, useState } from "react";
import { Separator } from "./ui/separator";

const menuItems = [
  { icon: Home, label: "ראשי", path: "/worker", exact: true },
  { icon: Briefcase, label: "עבודות", path: "/worker/jobs", exact: false, showDot: true },
  { icon: MessageCircle, label: "הודעות", path: "/chat", exact: false },
];

const secondaryItems = [
  { icon: User, label: "פרופיל", path: "/worker/profile", exact: false },
  { icon: Star, label: "דירוגים", path: "/worker/ratings", exact: false },
  { icon: Settings, label: "הגדרות", path: "/worker/settings", exact: false },
];

export const WorkerSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [hasNewJobs, setHasNewJobs] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      checkNewJobs();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();
    if (data) setProfile(data);
  };

  const checkNewJobs = async () => {
    const { data: workerData } = await supabase
      .from("worker_profiles")
      .select("work_type")
      .eq("user_id", user?.id)
      .single();

    if (workerData) {
      const { count } = await supabase
        .from("job_requests")
        .select("*", { count: 'exact', head: true })
        .eq("status", "open")
        .or(`work_type.eq.${workerData.work_type},work_type.eq.laborer`);
      
      setHasNewJobs((count || 0) > 0);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("התנתקת בהצלחה");
    navigate("/");
  };

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'WK';
  };

  const isPathActive = (item: typeof menuItems[0]) => {
    const fullPath = `${location.pathname}${location.search}`;
    return item.exact 
      ? location.pathname === item.path
      : fullPath === item.path || location.pathname === item.path.split('?')[0];
  };

  const renderMenuItem = (item: typeof menuItems[0], showDot?: boolean) => {
    const Icon = item.icon;
    const isActive = isPathActive(item);
    const shouldShowDot = showDot && hasNewJobs && !isActive;

    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
        <span>{item.label}</span>
        {shouldShowDot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
        )}
      </button>
    );
  };

  return (
    <aside className="hidden md:flex w-60 bg-card border-l border-border flex-col">
      {/* User Profile Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {getInitials(profile?.full_name || 'Worker')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {profile?.full_name || 'פועל'}
            </p>
            <p className="text-xs text-muted-foreground">פאנל פועל</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => renderMenuItem(item, item.showDot))}
        
        <Separator className="my-3" />
        
        {secondaryItems.map((item) => renderMenuItem(item))}
      </nav>

      {/* Sign Out Button */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-[18px] w-[18px]" />
          התנתק
        </Button>
      </div>
    </aside>
  );
};
