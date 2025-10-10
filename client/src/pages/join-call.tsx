import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Video, Phone, Loader2 } from "lucide-react";
import VideoCallDialog from "@/components/VideoCallDialog";

type CallSession = {
  id: string;
  sessionCode: string;
  hostId: string;
  callType: "audio" | "video";
  createdAt: string;
};

export default function JoinCallPage() {
  const [, params] = useRoute("/join/:code");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [sessionCode, setSessionCode] = useState(params?.code || "");
  const [isLoading, setIsLoading] = useState(false);
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);

  // If code in URL and user is authenticated, automatically look it up
  useEffect(() => {
    if (params?.code && isAuthenticated) {
      handleJoinCall(params.code);
    }
  }, [params?.code, isAuthenticated]);

  const handleJoinCall = async (code?: string) => {
    const codeToJoin = code || sessionCode.trim();
    
    if (!codeToJoin) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit session code",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{6}$/.test(codeToJoin)) {
      toast({
        title: "Invalid Format",
        description: "Session code must be 6 digits",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/call-sessions/${codeToJoin}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Session Not Found",
            description: "This call session doesn't exist or has expired",
            variant: "destructive",
          });
        } else {
          throw new Error('Failed to join call');
        }
        return;
      }

      const session = await response.json();
      setCallSession(session);
      setIsCallDialogOpen(true);
      
      toast({
        title: "Joining Call",
        description: `Connecting to ${session.callType} call...`,
      });
    } catch (error) {
      console.error('Failed to join call:', error);
      toast({
        title: "Join Failed",
        description: "Could not join the call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallClose = () => {
    setIsCallDialogOpen(false);
    setCallSession(null);
    setLocation("/");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join Call</CardTitle>
            <CardDescription>
              You need to be signed in to join a call
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full" data-testid="button-go-home">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Join Call
            </CardTitle>
            <CardDescription>
              Enter a 6-digit session code to join an ongoing call
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="session-code" className="text-sm font-medium">
                Session Code
              </label>
              <Input
                id="session-code"
                data-testid="input-session-code"
                placeholder="123456"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-2xl font-mono tracking-widest text-center"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Ask the call host for the 6-digit code
              </p>
            </div>

            <Button
              onClick={() => handleJoinCall()}
              disabled={isLoading || sessionCode.length !== 6}
              className="w-full gap-2"
              data-testid="button-join-call"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4" />
                  Join Call
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {callSession && (
        <VideoCallDialog
          isOpen={isCallDialogOpen}
          onClose={handleCallClose}
          callerId={callSession.hostId}
          callType={callSession.callType}
          isIncoming={true}
        />
      )}
    </>
  );
}
