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
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // 2. Clear client-side localStorage
      console.log("[Logout] Clearing localStorage...");
      localStorage.removeItem("peacepad_session_id");
      localStorage.removeItem("pending_join_code");
      
      // 3. Redirect to logout endpoint (GET request that handles OIDC logout)
      console.log("[Logout] Redirecting to /api/logout...");
      window.location.href = "/api/logout";
    } catch (error) {
      console.error("[Logout] Error during logout:", error);
      
      // Even on error, clear local state and redirect
      queryClient.setQueryData(["/api/auth/user"], null);
      localStorage.removeItem("peacepad_session_id");
      localStorage.removeItem("pending_join_code");
      window.location.href = "/api/logout";
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
                {user.displayName || "User"}
              </p>
              {user.email && (
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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
