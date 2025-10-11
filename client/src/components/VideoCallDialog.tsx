import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, Circle, Copy, Check, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface VideoCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId?: string;
  callType: "audio" | "video";
  isIncoming?: boolean;
  callerId?: string;
  sessionCodeProp?: string;
  initialCameraEnabled?: boolean;
  initialMicEnabled?: boolean;
}

export default function VideoCallDialog({
  isOpen,
  onClose,
  recipientId,
  callType,
  isIncoming = false,
  callerId,
  sessionCodeProp,
  initialCameraEnabled = true,
  initialMicEnabled = true,
}: VideoCallDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(!initialMicEnabled);
  const [isVideoOff, setIsVideoOff] = useState(callType === "audio" || !initialCameraEnabled);
  const [callDuration, setCallDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const pendingOfferRef = useRef<{ offer: RTCSessionDescriptionInit; from: string } | null>(null);

  // Create shareable session code when call starts or use provided code
  useEffect(() => {
    if (!isOpen || !user) return;

    // If session code is provided (joining existing call), use it
    if (sessionCodeProp) {
      setSessionCode(sessionCodeProp);
      return;
    }

    // Otherwise create new session (starting new call)
    if (isIncoming) return;

    const createCallSession = async () => {
      try {
        const response = await fetch('/api/call-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ callType }),
        });

        if (response.ok) {
          const session = await response.json();
          setSessionCode(session.sessionCode);
        }
      } catch (error) {
        console.error('Failed to create call session:', error);
      }
    };

    createCallSession();
  }, [isOpen, user, callType, isIncoming, sessionCodeProp]);

  useEffect(() => {
    if (!isOpen || !user) return;

    const sessionId = localStorage.getItem("peacepad_session_id");
    if (!sessionId) return;

    const ws = new WebSocket(
      `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/signaling?sessionId=${sessionId}&userId=${user.id}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebRTC signaling connected");
      
      if (!isIncoming && recipientId) {
        ws.send(JSON.stringify({
          type: "call-start",
          to: recipientId,
          payload: { callType },
        }));
        initializeCall();
      }
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case "offer":
          await handleOffer(message.payload, message.from);
          break;
        case "answer":
          await handleAnswer(message.payload);
          break;
        case "ice-candidate":
          await handleIceCandidate(message.payload);
          break;
        case "incoming-call":
          if (isIncoming) {
            initializeCall();
          }
          break;
        case "call-ended":
          endCall();
          break;
      }
    };

    ws.onerror = (error) => {
      console.error("WebRTC signaling error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to call server",
        variant: "destructive",
      });
    };

    return () => {
      cleanup();
    };
  }, [isOpen, user, recipientId, callType, isIncoming]);

  const initializeCall = async () => {
    try {
      const configuration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };

      // Create peer connection BEFORE getting media
      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setIsConnected(true);
          startCallTimer();
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: "ice-candidate",
            to: recipientId || callerId,
            payload: event.candidate,
          }));
        }
      };

      // Process pending offer if it arrived before peer connection was ready
      if (pendingOfferRef.current) {
        const { offer, from } = pendingOfferRef.current;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        pendingOfferRef.current = null;
      }

      // Get user media AFTER creating peer connection
      // Always request tracks so they can be toggled later
      const constraints = {
        audio: true,
        video: callType === "video",
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      // Immediately disable tracks based on preview settings
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = initialMicEnabled;
      }
      
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = initialCameraEnabled;
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle outgoing call
      if (!isIncoming) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: "offer",
            to: recipientId,
            payload: offer,
          }));
        }
      } 
      // Handle incoming call - create answer if remote description was set
      else if (pc.remoteDescription) {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: "answer",
            to: callerId,
            payload: answer,
          }));
        }
      }
    } catch (error) {
      console.error("Failed to initialize call:", error);
      
      // Set error state but keep dialog open so user can still access session code
      const errorMessage = error instanceof Error && error.name === "NotAllowedError"
        ? "Camera/microphone access denied. Please allow access to join the call."
        : "Could not access camera/microphone. You can still share the session code.";
      
      setMediaError(errorMessage);
      
      toast({
        title: "Media Access Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Don't close dialog - allow user to access session code for sharing
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, from: string) => {
    if (!peerConnectionRef.current) {
      // Store offer to process after peer connection is ready
      pendingOfferRef.current = { offer, from };
      return;
    }

    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: "answer",
          to: from,
          payload: answer,
        }));
      }
    } catch (error) {
      console.error("Failed to handle offer:", error);
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;
    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) return;
    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      if (!localStreamRef.current) return;

      const stream = localStreamRef.current;
      const options = { mimeType: "video/webm;codecs=vp9" };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = "video/webm";
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        
        // Download locally
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `call-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        
        // Save to backend
        try {
          const formData = new FormData();
          formData.append('file', blob, `recording-${Date.now()}.webm`);
          const sessionId = recipientId || callerId || '';
          formData.append('sessionCode', `call-${user?.id}-${sessionId}-${Date.now()}`);
          formData.append('recordingType', isVideoOff ? 'audio' : 'video');
          formData.append('duration', callDuration.toString());
          
          await fetch('/api/call-recordings', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
          
          toast({
            title: "Recording Saved",
            description: "Your call recording has been saved and downloaded",
          });
        } catch (error) {
          console.error('Failed to save recording:', error);
          toast({
            title: "Recording Downloaded",
            description: "Recording saved locally but failed to upload to cloud",
          });
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: "Call is being recorded",
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast({
        title: "Recording Failed",
        description: "Could not start call recording",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const copySessionCode = async () => {
    if (!sessionCode) return;

    try {
      await navigator.clipboard.writeText(sessionCode);
      setCodeCopied(true);
      toast({
        title: "Session Code Copied!",
        description: `Share code ${sessionCode} with others to join this call`,
      });
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast({
        title: "Copy Failed",
        description: "Could not copy session code to clipboard",
        variant: "destructive",
      });
    }
  };

  const copyShareableLink = async () => {
    if (!sessionCode) return;

    const shareableUrl = `${window.location.origin}/join/${sessionCode}`;
    
    try {
      await navigator.clipboard.writeText(shareableUrl);
      toast({
        title: "Link Copied!",
        description: "Share this link with others to join the call",
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Copy Failed",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const shareViaSystem = async () => {
    if (!sessionCode) return;

    const shareableUrl = `${window.location.origin}/join/${sessionCode}`;
    const shareData = {
      title: 'Join my PeacePad call',
      text: `Join my ${callType} call on PeacePad. Session code: ${sessionCode}`,
      url: shareableUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: "Shared Successfully!",
          description: "Invitation sent",
        });
      } else {
        // Fallback to copying link
        await copyShareableLink();
      }
    } catch (error) {
      // User cancelled or share failed
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to share:', error);
      }
    }
  };

  const endCall = () => {
    if (isRecording) {
      stopRecording();
    }
    
    if (wsRef.current && (recipientId || callerId)) {
      wsRef.current.send(JSON.stringify({
        type: "call-end",
        to: recipientId || callerId,
      }));
    }
    cleanup();
    onClose();
  };

  const cleanup = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px]" data-testid="dialog-video-call">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span data-testid="text-call-status">
              {isConnected ? "Connected" : isIncoming ? "Incoming Call..." : "Calling..."}
            </span>
            {isConnected && (
              <span className="text-sm text-muted-foreground" data-testid="text-call-duration">
                {formatDuration(callDuration)}
              </span>
            )}
          </DialogTitle>
          
          {/* Session Code Display - Like Teams/Zoom */}
          {sessionCode && (
            <div className="mt-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
              {/* Media Error Display */}
              {mediaError && (
                <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                  <svg className="h-5 w-5 text-destructive mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive mb-1">Media Access Error</p>
                    <p className="text-xs text-destructive/80">{mediaError}</p>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mb-3">Share to invite others to this call:</p>
              
              {/* Session Code */}
              <div className="mb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground mb-1">Session Code:</p>
                    <span className="text-2xl font-mono font-bold text-primary tracking-widest" data-testid="text-session-code">
                      {sessionCode}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copySessionCode}
                    data-testid="button-copy-session-code"
                    className="gap-2"
                  >
                    {codeCopied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Shareable Link */}
              <div className="pt-3 border-t border-primary/20">
                <p className="text-xs font-medium text-foreground mb-1">Or share this link:</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-background/50 rounded border border-border text-sm font-mono text-muted-foreground truncate" data-testid="text-shareable-link">
                    {window.location.origin}/join/{sessionCode}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareViaSystem}
                    data-testid="button-share"
                    className="gap-2 shrink-0"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyShareableLink}
                    data-testid="button-copy-link"
                    className="gap-2 shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 relative">
          <div className="relative bg-muted rounded-lg overflow-hidden" data-testid="video-remote">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {!isConnected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground">Waiting for connection...</p>
              </div>
            )}
          </div>

          <div className="relative bg-muted rounded-lg overflow-hidden" data-testid="video-local">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <VideoOff className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 py-4">
          {callType === "video" && (
            <Button
              size="icon"
              variant={isVideoOff ? "destructive" : "secondary"}
              onClick={toggleVideo}
              data-testid="button-toggle-video"
            >
              {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            </Button>
          )}
          
          <Button
            size="icon"
            variant={isMuted ? "destructive" : "secondary"}
            onClick={toggleMute}
            data-testid="button-toggle-mute"
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button
            size="icon"
            variant={isRecording ? "destructive" : "secondary"}
            onClick={toggleRecording}
            disabled={!isConnected}
            data-testid="button-toggle-recording"
          >
            <Circle className={`h-4 w-4 ${isRecording ? "fill-current" : ""}`} />
          </Button>

          <Button
            size="icon"
            variant="destructive"
            onClick={endCall}
            data-testid="button-end-call"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
