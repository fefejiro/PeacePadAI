import { Link, useLocation } from "wouter";
import { MessageCircle, Phone, Calendar, CheckSquare, Menu, Heart, DollarSign, PawPrint, FileText, Settings, User, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";

export function BottomNav() {
  const [location] = useLocation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { logout } = useAuth();

  const isActive = (path: string) => {
    if (path === "/chat" && (location === "/" || location === "/chat")) return true;
    return location === path;
  };

  const handleLogout = async () => {
    console.log("[BottomNav Logout] Starting logout process...");
    try {
      // Clear React Query cache
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // Clear localStorage
      localStorage.removeItem("peacepad_session_id");
      localStorage.removeItem("pending_join_code");
      
      // Redirect to logout endpoint
      window.location.href = "/api/logout";
    } catch (error) {
      console.error("[BottomNav Logout] Error during logout:", error);
      
      // Even on error, clear local state and redirect
      queryClient.setQueryData(["/api/auth/user"], null);
      localStorage.removeItem("peacepad_session_id");
      localStorage.removeItem("pending_join_code");
      window.location.href = "/api/logout";
    }
  };

  const navItems = [
    { path: "/chat", icon: MessageCircle, label: "Chat" },
    { path: "/calls", icon: Phone, label: "Calls" },
    { path: "/scheduling", icon: Calendar, label: "Schedule" },
    { path: "/tasks", icon: CheckSquare, label: "Tasks" },
  ];

  const moreItems = [
    { path: "/dashboard", icon: User, label: "Dashboard" },
    { path: "/expenses", icon: DollarSign, label: "Expenses" },
    { path: "/therapist-directory", icon: Heart, label: "Find Support" },
    { path: "/audit-trail", icon: FileText, label: "Notes" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t shadow-2xl z-50 safe-area-bottom"
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {/* Main Nav Items */}
        {navItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 sm:px-4 py-2 rounded-2xl min-w-[60px] sm:min-w-[68px] hover-elevate active-elevate-2",
                isActive(item.path)
                  ? "text-primary bg-primary/15"
                  : "text-muted-foreground"
              )}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className={cn(
                "h-5 w-5 sm:h-6 sm:w-6",
                isActive(item.path) && "animate-gentle-bounce"
              )} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          </Link>
        ))}

        {/* More Menu */}
        <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
          <SheetTrigger asChild>
            <button
              className="flex flex-col items-center justify-center gap-1 px-3 sm:px-4 py-2 rounded-2xl min-w-[60px] sm:min-w-[68px] text-muted-foreground hover-elevate active-elevate-2"
              data-testid="nav-more"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[65vh] rounded-t-3xl">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-2xl">More Options</SheetTitle>
            </SheetHeader>
            <div className="space-y-1.5">
              {moreItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 h-12 rounded-xl text-base",
                      isActive(item.path) && "bg-primary/15 text-primary"
                    )}
                    onClick={() => setMoreMenuOpen(false)}
                    data-testid={`more-${item.label.toLowerCase()}`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              ))}
              
              {/* Sign Out Button */}
              <div className="pt-3 border-t mt-3">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 rounded-xl text-base text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                  data-testid="button-logout-mobile"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
