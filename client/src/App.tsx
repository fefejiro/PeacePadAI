import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import LandingPage from "@/pages/landing";
import ChatPage from "@/pages/chat";
import DashboardPage from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import TherapistLocatorPage from "@/pages/therapist-locator";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/therapist-locator" component={TherapistLocatorPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthWrapper>
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <ConditionalSidebar />
                <div className="flex flex-col flex-1">
                  <header className="flex items-center justify-between p-2 border-b sticky top-0 z-50 bg-background">
                    <ConditionalSidebarTrigger />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-auto">
                    <Router />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </AuthWrapper>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function ConditionalSidebar() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return <AppSidebar />;
}

function ConditionalSidebarTrigger() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <div />;
  return <SidebarTrigger data-testid="button-sidebar-toggle" />;
}
