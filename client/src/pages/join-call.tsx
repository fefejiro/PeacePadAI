import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Video, Phone, Loader2, VideoOff, Mic, MicOff, User, AlertCircle } from "lucide-react";
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [sessionCode, setSessionCode] = useState(params?.code || "");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pre-join settings
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRequestIdRef = useRef(0);

  // Auto-fill display name from user profile
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    } else if (user?.firstName) {
      setDisplayName(user.firstName);
    }
  }, [user]);

  // If code in URL, fetch session and show preview mode (no auth required for fetching session)
  useEffect(() => {
    if (params?.code && !callSession && !authLoading) {
      setSessionCode(params.code);
      // Fetch the session data
      const fetchSession = async () => {
        try {
          const response = await fetch(`/api/call-sessions/${params.code}`, {
            credentials: 'include',
          });

          if (response.ok) {
            const session = await response.json();
            setCallSession(session);
            
            // If user is authenticated, show preview directly
            // If not, they'll need to enter guest info first (handled by redirect in render)
            if (isAuthenticated) {
              setShowPreview(true);
            }
          } else {
            setError("Session not found. Please check the code.");
          }
        } catch (error) {
          console.error('Failed to fetch session:', error);
          setError("Failed to load session. Please try again.");
        }
      };
      
      fetchSession();
    }
  }, [params?.code, callSession, authLoading, isAuthenticated]);

  // Start media preview with explicit parameters
  const startMediaPreview = async (videoEnabled: boolean, audioEnabled: boolean) => {
    // Increment request ID to track this request
    const requestId = ++mediaRequestIdRef.current;
    
    try {
      const constraints: MediaStreamConstraints = {
        video: videoEnabled,
        audio: audioEnabled,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Only apply result if this is still the latest request
      if (requestId === mediaRequestIdRef.current) {
        setMediaStream(stream);
        
        if (videoPreviewRef.current && videoEnabled) {
          videoPreviewRef.current.srcObject = stream;
        }
      } else {
        // Discard stale result
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      // Only log error if this is still the latest request
      // Don't show toast in preview mode - users are still configuring
      if (requestId === mediaRequestIdRef.current) {
        console.error('Failed to get media devices:', error);
      }
    }
  };

  // Stop media preview
  const stopMediaPreview = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    // Invalidate any pending requests to prevent them from applying
    mediaRequestIdRef.current++;
  };

  // Toggle camera
  const toggleCamera = async () => {
    const newCameraState = !cameraEnabled;
    setCameraEnabled(newCameraState);
    
    // Always restart preview with new settings
    stopMediaPreview();
    if (newCameraState || micEnabled) {
      await startMediaPreview(newCameraState, micEnabled);
    }
  };

  // Toggle microphone
  const toggleMic = async () => {
    const newMicState = !micEnabled;
    setMicEnabled(newMicState);
    
    // Always restart preview with new settings
    stopMediaPreview();
    if (cameraEnabled || newMicState) {
      await startMediaPreview(cameraEnabled, newMicState);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopMediaPreview();
    };
  }, []);

  // Start preview when entering preview mode
  useEffect(() => {
    if (showPreview && (cameraEnabled || micEnabled)) {
      startMediaPreview(cameraEnabled, micEnabled);
    }
    return () => {
      if (!isCallDialogOpen) {
        stopMediaPreview();
      }
    };
  }, [showPreview]);

  const handleContinue = async () => {
    const codeToJoin = sessionCode.trim();
    
    if (!codeToJoin) {
      setError("Please enter a 6-digit session code");
      return;
    }

    if (!/^\d{6}$/.test(codeToJoin)) {
      setError("Session code must be 6 digits");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/call-sessions/${codeToJoin}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        
        if (response.status === 404) {
          setError("This call session doesn't exist or has ended. Please check the code and try again.");
          toast({
            title: "Session Not Found",
            description: "This call session doesn't exist or has expired",
            variant: "destructive",
          });
        } else if (response.status === 401) {
          setError("Authentication required. Please sign in to join calls.");
        } else {
          setError(data.message || "Could not connect to the call. Please try again.");
        }
        return;
      }

      const session = await response.json();
      setCallSession(session);
      
      // Show preview mode instead of directly opening dialog
      setShowPreview(true);
      setError(null);
    } catch (error) {
      console.error('Failed to validate session:', error);
      setError("Network error. Please check your connection and try again.");
      toast({
        title: "Connection Error",
        description: "Could not reach the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinCall = async () => {
    // Update display name if user entered one
    if (displayName.trim() && displayName !== user?.displayName) {
      sessionStorage.setItem('call_display_name', displayName.trim());
    }
    
    // Stop preview media before opening dialog to free devices
    stopMediaPreview();
    
    setIsCallDialogOpen(true);
    
    toast({
      title: "Joining Call",
      description: `Connecting to ${callSession?.callType} call...`,
    });
  };

  const handleCallClose = () => {
    setIsCallDialogOpen(false);
    setCallSession(null);
    stopMediaPreview();
    setLocation("/");
  };

  const handleBackToCode = () => {
    setShowPreview(false);
    stopMediaPreview();
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // Preview mode - show camera/mic setup
  if (showPreview) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Ready to Join?
              </CardTitle>
              <CardDescription>
                Session Code: <span className="font-mono font-semibold text-foreground">{sessionCode}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                  </div>
                </div>
              )}

              {/* Camera Preview */}
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                {cameraEnabled && mediaStream ? (
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoOff className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Display Name Input */}
              <div className="space-y-2">
                <Label htmlFor="display-name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Your Name
                </Label>
                <Input
                  id="display-name"
                  data-testid="input-display-name"
                  placeholder="Enter your name (optional)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">
                  {displayName.trim() ? `You'll join as "${displayName}"` : "You'll join as a guest"}
                </p>
              </div>

              {/* Camera & Mic Toggles */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {cameraEnabled ? (
                      <Video className="h-5 w-5 text-primary" />
                    ) : (
                      <VideoOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <Label htmlFor="camera-toggle" className="cursor-pointer">
                      Camera
                    </Label>
                  </div>
                  <Switch
                    id="camera-toggle"
                    checked={cameraEnabled}
                    onCheckedChange={toggleCamera}
                    data-testid="switch-camera"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {micEnabled ? (
                      <Mic className="h-5 w-5 text-primary" />
                    ) : (
                      <MicOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <Label htmlFor="mic-toggle" className="cursor-pointer">
                      Microphone
                    </Label>
                  </div>
                  <Switch
                    id="mic-toggle"
                    checked={micEnabled}
                    onCheckedChange={toggleMic}
                    data-testid="switch-microphone"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleBackToCode}
                  className="flex-1"
                  data-testid="button-back"
                >
                  Back
                </Button>
                <Button
                  onClick={handleJoinCall}
                  disabled={isLoading}
                  className="flex-1 gap-2"
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
                      Join Now
                    </>
                  )}
                </Button>
              </div>
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
            sessionCodeProp={callSession.sessionCode}
            initialCameraEnabled={cameraEnabled}
            initialMicEnabled={micEnabled}
          />
        )}
      </>
    );
  }

  // Code entry mode
  return (
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
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="session-code">Session Code</Label>
            <Input
              id="session-code"
              data-testid="input-session-code"
              placeholder="123456"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-2xl font-mono tracking-widest text-center"
            />
            <p className="text-xs text-muted-foreground">
              Ask the call host for the 6-digit code
            </p>
          </div>

          <Button
            onClick={handleContinue}
            disabled={isLoading || sessionCode.length !== 6}
            className="w-full gap-2"
            data-testid="button-continue"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4" />
                Continue
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
