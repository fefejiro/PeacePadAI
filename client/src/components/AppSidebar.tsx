import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { MessageCircle, LayoutDashboard, Settings, LogOut, MapPin, Calendar, FileText, Users } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

const menuItems = [
  {
    title: "Chat",
    url: "/",
    icon: MessageCircle,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Scheduling",
    url: "/scheduling",
    icon: Calendar,
  },
  {
    title: "Find Support",
    url: "/therapist-locator",
    icon: MapPin,
  },
  {
    title: "Therapist Directory",
    url: "/therapist-directory",
    icon: Users,
  },
  {
    title: "Audit Trail",
    url: "/audit-trail",
    icon: FileText,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      // 1. Call logout endpoint to destroy server session
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // 2. Always clear client-side data regardless of API success
      localStorage.removeItem("peacepad_session_id");
      
      // 3. Clear React Query cache
      queryClient.clear();
      
      // 4. Redirect to landing page (which will trigger auth check)
      setLocation("/");
      
      // 5. Force page reload to ensure complete state reset
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">PeacePad</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <a href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </Button>
        <p className="text-xs text-muted-foreground">
          Communicate with peace and clarity
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
