import { Home, Wrench, Users, User, Star, Settings, LogOut, MessageCircle } from "lucide-react";
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
  { icon: Home, label: "ראשי", path: "/technician", exact: true },
  { icon: Wrench, label: "קריאות שירות", path: "/technician/requests", exact: false, showDot: true },
  { icon: Users, label: "קבלנים", path: "/technician/contractors", exact: false },
  { icon: MessageCircle, label: "הודעות", path: "/chat", exact: false },
];

const secondaryItems = [
  { icon: User, label: "פרופיל", path: "/technician/profile", exact: false },
  { icon: Star, label: "דירוגים", path: "/technician/ratings", exact: false },
  { icon: Settings, label: "הגדרות", path: "/technician/settings", exact: false },
];

export const TechnicianSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [techProfile, setTechProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();
    if (data) setProfile(data);

    const { data: techData } = await supabase
      .from("technician_profiles")
      .select("*")
      .eq("user_id", user?.id)
      .single();
    if (techData) setTechProfile(techData);
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
      .slice(0, 2) || 'TK';
  };

  const isPathActive = (item: typeof menuItems[0]) => {
    const fullPath = `${location.pathname}${location.search}`;
    return item.exact 
      ? location.pathname === item.path
      : fullPath === item.path || location.pathname === item.path.split('?')[0];
  };

  const renderMenuItem = (item: typeof menuItems[0]) => {
    const Icon = item.icon;
    const isActive = isPathActive(item);

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
              {getInitials(profile?.full_name || 'טכנאי')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {profile?.full_name || 'פועל טכנאי'}
            </p>
            <p className="text-xs text-muted-foreground">פאנל טכנאי</p>
          </div>
          {techProfile?.rating > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold">{techProfile.rating}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => renderMenuItem(item))}
        
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
