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
import { MessageCircle, Phone, LayoutDashboard, Settings, LogOut, MapPin, Calendar, FileText, Users, User, PhoneIncoming, DollarSign, CheckSquare } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";

const communicateItems = [
  {
    title: "Chat",
    url: "/",
    icon: MessageCircle,
  },
  {
    title: "Calls",
    url: "/calls",
    icon: Phone,
  },
  {
    title: "Join Call",
    url: "/join",
    icon: PhoneIncoming,
  },
];

const organizeItems = [
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
    title: "Tasks",
    url: "/tasks",
    icon: CheckSquare,
  },
  {
    title: "Expenses",
    url: "/expenses",
    icon: DollarSign,
  },
];

const supportItems = [
  {
    title: "Find Support",
    url: "/therapist-directory",
    icon: MapPin,
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
      // 1. Clear React Query cache FIRST to prevent any refetches during logout
      console.log("[Logout] Clearing React Query cache...");
      queryClient.setQueryData(["/api/auth/me"], null);
      
      // 2. Call logout endpoint to destroy server session and clear cookie
      console.log("[Logout] Calling /api/auth/logout...");
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      
      // 3. Clear client-side localStorage
      console.log("[Logout] Clearing localStorage...");
      localStorage.removeItem("peacepad_session_id");
      localStorage.removeItem("pending_join_code");
      
      // 4. Invalidate all queries to force refetch with new auth state
      console.log("[Logout] Invalidating queries...");
      await queryClient.invalidateQueries();
      
      // 5. Navigate to landing page - React will handle the re-render
      console.log("[Logout] Navigating to landing...");
      setLocation("/");
    } catch (error) {
      console.error("[Logout] Error during logout:", error);
      
      // Even on error, clear local state
      queryClient.setQueryData(["/api/auth/me"], null);
      localStorage.removeItem("peacepad_session_id");
      localStorage.removeItem("pending_join_code");
      await queryClient.invalidateQueries();
      setLocation("/");
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
          <SidebarGroupLabel>Communicate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {communicateItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <a href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Organize</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {organizeItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <a href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <a href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
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
