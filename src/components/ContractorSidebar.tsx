import { Home, Users, CreditCard, Settings, LogOut, MessageCircle, Wrench } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "דשבורד", url: "/contractor", icon: Home },
  { title: "מאגר עובדים", url: "/contractor/workers", icon: Users },
  { title: "הקריאות שלי", url: "/contractor/jobs", icon: CreditCard },
  { title: "הודעות", url: "/chat", icon: MessageCircle },
  { title: "תחזוקת ציוד", url: "/contractor/maintenance", icon: Wrench },
  { title: "הגדרות", url: "/contractor/settings", icon: Settings },
];

export function ContractorSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("התנתקת בהצלחה");
    navigate("/auth");
  };

  return (
    <Sidebar side="right" collapsible="icon" className="border-l border-stone-200 bg-white shadow-sm hidden md:flex">
      <SidebarContent className="gap-6 p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-right text-base font-bold px-3 py-4 text-foreground">
            {!collapsed && "תפריט"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url || 
                  (item.url === "/contractor" && location.pathname === "/contractor/dashboard");
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/contractor"}
                        className="h-11 hover:bg-muted transition-all duration-300 rounded-lg px-3 group"
                        activeClassName="bg-primary/10 text-primary font-semibold border border-primary/20"
                      >
                        <item.icon className="h-5 w-5 ml-2 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleSignOut} 
              className="h-11 hover:bg-destructive/10 hover:text-destructive transition-all duration-300 rounded-lg px-3 group"
            >
              <LogOut className="h-5 w-5 ml-2 shrink-0 transition-transform duration-300 group-hover:scale-110" />
              {!collapsed && <span className="text-sm font-semibold">התנתק</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
