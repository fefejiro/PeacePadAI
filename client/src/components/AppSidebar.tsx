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
import { MessageCircle, LayoutDashboard, Settings, LogOut, MapPin, Calendar, FileText, Users, User } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();

  const isEmoji = user?.profileImageUrl?.startsWith("emoji:");
  const emojiValue = isEmoji && user?.profileImageUrl ? user.profileImageUrl.replace("emoji:", "") : "";

  const handleLogout = async () => {
    console.log("[Logout] Starting logout process...");
    try {
      // 1. Call logout endpoint to destroy server session
      console.log("[Logout] Calling /api/auth/logout...");
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      console.log("[Logout] Logout response:", response.status, response.statusText);
      
      // 2. Clear client-side data
      console.log("[Logout] Clearing localStorage...");
      localStorage.removeItem("peacepad_session_id");
      
      // 3. Clear React Query cache and set auth to null immediately
      console.log("[Logout] Clearing React Query cache...");
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      
      // 4. Navigate using wouter and then force reload
      console.log("[Logout] Navigating to landing...");
      setLocation("/");
      
      // 5. Force page reload as backup
      console.log("[Logout] Forcing page reload...");
      setTimeout(() => {
        window.location.replace("/");
      }, 50);
    } catch (error) {
      console.error("[Logout] Error during logout:", error);
      
      // Even on error, clear local state and reload
      localStorage.removeItem("peacepad_session_id");
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      setLocation("/");
      setTimeout(() => {
        window.location.replace("/");
      }, 50);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">PeacePad</h2>
        </div>
        {user && (
          <div className="flex items-center gap-3 p-2 bg-card rounded-lg border border-card-border">
            <Avatar className="h-10 w-10">
              {isEmoji ? (
                <div className="flex items-center justify-center text-2xl">{emojiValue}</div>
              ) : user.profileImageUrl ? (
                <AvatarImage src={user.profileImageUrl} alt={user.displayName || "User"} />
              ) : (
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate" data-testid="text-user-displayname">
                {user.displayName || "Guest"}
              </p>
              {user.isGuest && (
                <p className="text-xs text-muted-foreground">Guest User</p>
              )}
            </div>
          </div>
        )}
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
