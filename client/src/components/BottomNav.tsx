import { Link, useLocation } from "wouter";
import { MessageCircle, Calendar, CheckSquare, Menu, Heart, DollarSign, PawPrint, FileText, Settings, User } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/chat" && (location === "/" || location === "/chat")) return true;
    return location === path;
  };

  const navItems = [
    { path: "/chat", icon: MessageCircle, label: "Chat" },
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
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50"
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {/* Main Nav Items */}
        {navItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[60px] hover-elevate active-elevate-2",
                isActive(item.path)
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground"
              )}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          </Link>
        ))}

        {/* More Menu */}
        <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
          <SheetTrigger asChild>
            <button
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[60px] text-muted-foreground hover-elevate active-elevate-2"
              data-testid="nav-more"
            >
              <Menu className="h-5 w-5" />
              <span className="text-xs font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh]">
            <SheetHeader>
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-2">
              {moreItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3",
                      isActive(item.path) && "bg-primary/10 text-primary"
                    )}
                    onClick={() => setMoreMenuOpen(false)}
                    data-testid={`more-${item.label.toLowerCase()}`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
