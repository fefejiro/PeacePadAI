import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useIncomingCalls } from "@/hooks/use-incoming-calls";
import { useReconnectingWebSocket } from "@/hooks/useReconnectingWebSocket";
import MoodCheckIn from "@/components/MoodCheckIn";
import Clippy from "@/components/Clippy";
import TransitionPrompt from "@/components/TransitionPrompt";
import { ActivityProvider } from "@/components/ActivityProvider";
import { IncomingCallModal } from "@/components/IncomingCallModal";
import { useToast } from "@/hooks/use-toast";
import LandingPage from "@/pages/landing";
import OnboardingPage from "@/pages/onboarding";
import JoinPartnershipPage from "@/pages/join-partnership";
import ChatPage from "@/pages/chat";
import DashboardPage from "@/pages/dashboard";
import SchedulingPage from "@/pages/scheduling";
import TasksPage from "@/pages/tasks";
import ExpensesPage from "@/pages/expenses";
import SettingsPage from "@/pages/settings";
import TherapistLocatorPage from "@/pages/therapist-locator";
import TherapistDirectoryPage from "@/pages/therapist-directory";
import AuditTrailPage from "@/pages/audit-trail";
import JoinCallPage from "@/pages/join-call";
import CallsPage from "@/pages/calls";
import TermsPage from "@/pages/terms";
import NotFound from "@/pages/not-found";
import { TermsAcceptanceDialog } from "@/components/TermsAcceptanceDialog";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading only briefly while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // If authenticated, show authenticated routes
  if (isAuthenticated && user) {
    // Check if user needs to accept terms
    const needsTermsAcceptance = !user.termsAcceptedAt;

    return (
      <>
        <Switch>
          <Route path="/" component={ChatPage} />
          <Route path="/chat" component={ChatPage} />
          <Route path="/calls" component={CallsPage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/scheduling" component={SchedulingPage} />
          <Route path="/tasks" component={TasksPage} />
          <Route path="/expenses" component={ExpensesPage} />
          <Route path="/therapist-locator" component={TherapistLocatorPage} />
          <Route path="/therapist-directory" component={TherapistDirectoryPage} />
          <Route path="/audit-trail" component={AuditTrailPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/join/:code" component={JoinPartnershipPage} />
          <Route path="/call/:code" component={JoinCallPage} />
          <Route path="/call" component={JoinCallPage} />
          <Route component={NotFound} />
        </Switch>
        {needsTermsAcceptance && (
          <TermsAcceptanceDialog open={true} userId={user.id} />
        )}
      </>
    );
  }

  // Not authenticated, show landing, onboarding, or join partnership page
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/join/:code" component={JoinPartnershipPage} />
      <Route path="/call/:code" component={JoinCallPage} />
      <Route path="/call" component={JoinCallPage} />
      <Route component={LandingPage} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Check localStorage for wellness feature settings (default OFF)
  const clippyEnabled = localStorage.getItem("clippy_enabled") === "true";
  const moodCheckInsEnabled = localStorage.getItem("mood_checkins_enabled") === "true";

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <ActivityProvider>
            <AuthWrapper>
              <SidebarProvider style={style as React.CSSProperties}>
                <div className="flex h-screen w-full">
                  <ConditionalSidebar />
                  <div className="flex flex-col flex-1 min-w-0">
                    <header className="flex items-center justify-between p-3 sm:p-2 border-b sticky top-0 z-50 bg-background">
                      <ConditionalSidebarTrigger />
                    </header>
                    <main className="flex-1 overflow-auto pb-16 lg:pb-0">
                      <Router />
                    </main>
                    <ConditionalBottomNav />
                  </div>
                </div>
              </SidebarProvider>
            </AuthWrapper>
            {moodCheckInsEnabled && <TransitionPrompt />}
            {moodCheckInsEnabled && <MoodCheckIn />}
            {clippyEnabled && <Clippy />}
            <Toaster />
          </ActivityProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { incomingCall, clearIncomingCall } = useIncomingCalls();

  // Global WebSocket connection for all real-time features
  const sessionId = typeof window !== 'undefined' ? (localStorage.getItem("peacepad_session_id") || user?.id || '') : '';
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = user ? `${protocol}//${window.location.host}/ws/signaling?sessionId=${sessionId}&userId=${user.id}` : '';

  useReconnectingWebSocket({
    url: wsUrl,
    enabled: !!user,
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle all message types
        if (data.type === "new-message") {
          queryClient.invalidateQueries({ 
            predicate: (query) => query.queryKey[0] === "/api/conversations"
          });
        } else if (data.type === "partnership-joined") {
          toast({
            title: "New Partnership! 🎉",
            description: `${data.partnerName} joined using your invite code`,
            duration: 3000,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/partnerships"] });
          queryClient.invalidateQueries({ 
            predicate: (query) => query.queryKey[0] === "/api/conversations"
          });
        } else if (data.type === "incoming-call") {
          // Dispatch custom event for incoming call
          window.dispatchEvent(new CustomEvent('incoming-call', {
            detail: {
              callId: data.callId,
              callerId: data.callerId,
              callerName: data.callerName,
              callerProfileImageUrl: data.callerProfileImageUrl,
              callType: data.callType,
            }
          }));
        } else if (data.type === "call-accepted") {
          window.dispatchEvent(new CustomEvent('call-accepted', { detail: data }));
        } else if (data.type === "call-declined") {
          window.dispatchEvent(new CustomEvent('call-declined', { detail: data }));
        } else if (data.type === "call-ended") {
          window.dispatchEvent(new CustomEvent('call-ended', { detail: data }));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    },
  });

  const handleAcceptCall = (callId: string) => {
    clearIncomingCall();
    setLocation(`/call/${callId}`);
  };

  const handleDeclineCall = (callId: string, reason?: string) => {
    clearIncomingCall();
  };

  return (
    <>
      {children}
      <IncomingCallModal
        call={incomingCall}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
    </>
  );
}

function ConditionalSidebar() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  // Hide sidebar during onboarding and on mobile (bottom nav handles mobile)
  if (!isAuthenticated || location === "/onboarding") return null;
  return (
    <div className="hidden lg:block">
      <AppSidebar />
    </div>
  );
}

function ConditionalSidebarTrigger() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  // Hide sidebar trigger during onboarding and on mobile
  if (!isAuthenticated || location === "/onboarding") return <div />;
  return (
    <div className="hidden lg:block">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
    </div>
  );
}

function ConditionalBottomNav() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  // Show bottom nav only when authenticated and not on onboarding/landing
  if (!isAuthenticated || location === "/onboarding" || location === "/") return null;
  return <BottomNav />;
}
