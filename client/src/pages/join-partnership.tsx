import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, CheckCircle } from "lucide-react";

export default function JoinPartnershipPage() {
  const { code } = useParams<{ code: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const joinPartnershipMutation = useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await apiRequest("POST", "/api/partnerships/join", {
        inviteCode: inviteCode.toUpperCase(),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partnerships"] });
      toast({
        title: "Partnership created!",
        description: "You're now connected with your co-parent",
      });
      // Redirect to chat after successful join
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
    onError: (error: any) => {
      const message = error.message || "Failed to join partnership. The code may be invalid or already used.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // If not authenticated, store the code and redirect to onboarding
    if (!authLoading && !isAuthenticated && code) {
      localStorage.setItem("pending_join_code", code);
      setLocation("/onboarding");
      return;
    }

    // If authenticated and have a code, auto-join
    if (isAuthenticated && code && !joinPartnershipMutation.isPending && !joinPartnershipMutation.isSuccess) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        joinPartnershipMutation.mutate(code);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, authLoading, code]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!code) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h2 className="text-2xl font-bold">Invalid Link</h2>
            <CardDescription>No invite code found in the link</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {joinPartnershipMutation.isSuccess ? (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">Partnership Created!</h2>
              <CardDescription>Redirecting you to PeacePad...</CardDescription>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                {joinPartnershipMutation.isPending ? (
                  <Loader2 className="h-16 w-16 animate-spin text-primary" />
                ) : (
                  <UserPlus className="h-16 w-16 text-primary" />
                )}
              </div>
              <h2 className="text-2xl font-bold">
                {joinPartnershipMutation.isPending ? "Connecting..." : "Join Co-Parent"}
              </h2>
              <CardDescription>
                {joinPartnershipMutation.isPending 
                  ? "Creating your partnership..." 
                  : `Using invite code: ${code}`}
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        {!joinPartnershipMutation.isPending && !joinPartnershipMutation.isSuccess && (
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">Invite Code</p>
              <p className="text-2xl font-mono font-bold tracking-widest">{code}</p>
            </div>
            
            {joinPartnershipMutation.isError && (
              <div className="space-y-3">
                <Button 
                  onClick={() => joinPartnershipMutation.mutate(code)} 
                  className="w-full"
                  disabled={joinPartnershipMutation.isPending}
                >
                  Try Again
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/")} 
                  className="w-full"
                >
                  Go to Home
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
