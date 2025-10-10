import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface GuestEntryProps {
  onAuthenticated: () => void;
}

export default function GuestEntry({ onAuthenticated }: GuestEntryProps) {
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user already has a session
    const checkExistingSession = async () => {
      const sessionId = localStorage.getItem("peacepad_session_id");
      if (sessionId) {
        try {
          const response = await fetch("/api/auth/user");
          if (response.ok) {
            const data = await response.json();
            toast({
              title: "Welcome back!",
              description: `Hello again, ${data.displayName || 'Guest'}!`,
            });
            onAuthenticated();
          } else if (response.status === 401) {
            // Session expired, clear it silently
            localStorage.removeItem("peacepad_session_id");
          }
        } catch (error) {
          console.error("Session check error:", error);
          // Don't show error to user, just clear the session
          localStorage.removeItem("peacepad_session_id");
        }
      }
    };

    checkExistingSession();
  }, [onAuthenticated, toast]);

  const handleGuestEntry = async (asGuest: boolean) => {
    setIsLoading(true);
    try {
      const sessionId = localStorage.getItem("peacepad_session_id");
      const response = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: asGuest ? undefined : displayName || undefined,
          sessionId: sessionId || undefined,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Authentication failed" }));
        throw new Error(errorData.message || "Authentication failed");
      }

      const data = await response.json();
      localStorage.setItem("peacepad_session_id", data.sessionId);

      toast({
        title: "Success!",
        description: data.message,
      });

      onAuthenticated();
    } catch (error: any) {
      console.error("Guest entry error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to authenticate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-center">
            Welcome to PeacePad
          </CardTitle>
          <CardDescription className="text-center">
            A co-parenting communication platform with AI-powered emotional intelligence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name (Optional)</Label>
            <Input
              id="display-name"
              placeholder="Enter your name or stay anonymous"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
              data-testid="input-display-name"
            />
            <p className="text-sm text-muted-foreground">
              Leave blank to join as a guest
            </p>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => handleGuestEntry(false)}
              disabled={isLoading}
              data-testid="button-enter-with-name"
            >
              {isLoading ? "Entering..." : "Enter PeacePad"}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleGuestEntry(true)}
              disabled={isLoading}
              data-testid="button-enter-as-guest"
            >
              Continue as Guest
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>No email or password required</p>
            <p>Your session will last 14 days</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
