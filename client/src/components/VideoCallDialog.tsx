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
  const [isMediaReady, setIsMediaReady] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map()); // Support multiple peers
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map()); // Track remote streams by userId
  const pendingPeersRef = useRef<Array<{ peerId: string; shouldOffer: boolean }>>([]); // Peers waiting for media
  const pendingOffersRef = useRef<Map<string, RTCSessionDescriptionInit>>(new Map()); // Offers waiting for peer connection

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

  // Join call session when sessionCode is available
  useEffect(() => {
    if (!isOpen || !user || !wsRef.current) return;
    
    const code = sessionCode || sessionCodeProp;
    if (!code) return;
    
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "join-session",
        payload: { sessionCode: code },
      }));
      console.log(`Joining call session: ${code}`);
      initializeLocalMedia();
    }
  }, [isOpen, user, sessionCode, sessionCodeProp]);

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
      
      // Check if we have session code ready
      const code = sessionCode || sessionCodeProp;
      if (code) {
        ws.send(JSON.stringify({
          type: "join-session",
          payload: { sessionCode: code },
        }));
        console.log(`Joining call session: ${code}`);
        initializeLocalMedia();
      }
      // Legacy 1:1 call
      else if (!isIncoming && recipientId) {
        ws.send(JSON.stringify({
          type: "call-start",
          to: recipientId,
          payload: { callType },
        }));
        initializeLocalMedia();
      }
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case "session-users":
          // Got list of existing users in the session
          // I'm the newcomer, so I should wait for offers from existing members
          const existingUsers = message.payload.users || [];
          console.log("Existing users in session (I'm the newcomer):", existingUsers);
          for (const peer of existingUsers) {
            await createPeerConnection(peer.userId, false); // false = wait for offer
          }
          break;
          
        case "peer-joined":
          // New peer joined the session
          // I'm an existing member, so I create the offer
          console.log("Peer joined (I'm existing member):", message.from);
          await createPeerConnection(message.from, true); // true = create offer
          break;
          
        case "peer-left":
          // Peer left the session
          console.log("Peer left:", message.from);
          closePeerConnection(message.from);
          break;
          
        case "offer":
          await handleOffer(message.payload, message.from);
          break;
        case "answer":
          await handleAnswer(message.payload, message.from);
          break;
        case "ice-candidate":
          await handleIceCandidate(message.payload, message.from);
          break;
        case "incoming-call":
          if (isIncoming) {
            initializeLocalMedia();
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

  // Initialize local media (camera/microphone)
  const initializeLocalMedia = async () => {
    try {
      const constraints = {
        audio: true,
        video: callType === "video",
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      // Set initial track states based on preview settings
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

      console.log("Local media initialized");
      setIsMediaReady(true);
      
      // Process any pending peer connections now that media is ready
      if (pendingPeersRef.current.length > 0) {
        console.log(`Processing ${pendingPeersRef.current.length} pending peer connections`);
        for (const { peerId, shouldOffer } of pendingPeersRef.current) {
          await createPeerConnection(peerId, shouldOffer);
        }
        pendingPeersRef.current = [];
      }
    } catch (error) {
      console.error("Failed to initialize local media:", error);
      
      const errorMessage = error instanceof Error && error.name === "NotAllowedError"
        ? "Camera/microphone access denied. Please allow access to join the call."
        : "Could not access camera/microphone. You can still share the session code.";
      
      setMediaError(errorMessage);
      
      toast({
        title: "Media Access Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Create peer connection for a specific user
  const createPeerConnection = async (peerId: string, shouldCreateOffer: boolean) => {
    // If media not ready yet, queue this peer connection
    if (!isMediaReady || !localStreamRef.current) {
      console.log(`Media not ready, queuing peer connection for ${peerId}`);
      pendingPeersRef.current.push({ peerId, shouldOffer: shouldCreateOffer });
      return;
    }
    
    // Avoid duplicate connections
    if (peerConnectionsRef.current.has(peerId)) {
      console.log(`Peer connection already exists for ${peerId}`);
      return;
    }
    
    try {
      const configuration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };

      const pc = new RTCPeerConnection(configuration);
      peerConnectionsRef.current.set(peerId, pc);

      // Handle incoming tracks
      pc.ontrack = (event) => {
        console.log("Received track from", peerId);
        if (event.streams[0]) {
          remoteStreamsRef.current.set(peerId, event.streams[0]);
          
          // Display first remote stream
          if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setIsConnected(true);
            startCallTimer();
          }
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: "ice-candidate",
            to: peerId,
            payload: event.candidate,
          }));
        }
      };

      // Add local tracks (guaranteed to exist at this point)
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
      console.log(`Added ${localStreamRef.current.getTracks().length} local tracks to peer ${peerId}`);

      // Check for pending offer for this peer
      const pendingOffer = pendingOffersRef.current.get(peerId);
      if (pendingOffer) {
        console.log(`Processing pending offer from ${peerId}`);
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: "answer",
            to: peerId,
            payload: answer,
          }));
        }
        console.log("Sent answer to", peerId, "(from pending offer)");
        pendingOffersRef.current.delete(peerId);
      }
      // Create offer if we should (and no pending offer to answer)
      else if (shouldCreateOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: "offer",
            to: peerId,
            payload: offer,
          }));
        }
        console.log("Sent offer to", peerId);
      }
    } catch (error) {
      console.error(`Failed to create peer connection for ${peerId}:`, error);
    }
  };

  // Close peer connection
  const closePeerConnection = (peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    remoteStreamsRef.current.delete(peerId);
    console.log(`Closed connection to ${peerId}`);
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, from: string) => {
    try {
      let pc = peerConnectionsRef.current.get(from);
      
      // If peer connection doesn't exist yet (media not ready), cache the offer
      if (!pc) {
        console.log(`Peer connection not ready for ${from}, caching offer`);
        pendingOffersRef.current.set(from, offer);
        await createPeerConnection(from, false); // Will process offer once peer is created
        return;
      }

      // Apply offer and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: "answer",
          to: from,
          payload: answer,
        }));
      }
      console.log("Sent answer to", from);
    } catch (error) {
      console.error("Failed to handle offer:", error);
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, from: string) => {
    const pc = peerConnectionsRef.current.get(from);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("Set remote description from", from);
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, from: string) => {
    const pc = peerConnectionsRef.current.get(from);
    if (!pc) return;
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
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
    
    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();
    remoteStreamsRef.current.clear();
    
    // Leave session before closing WebSocket
    if (wsRef.current && sessionCode) {
      wsRef.current.send(JSON.stringify({ type: "leave-session" }));
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] sm:h-[600px] w-[95vw] sm:w-auto" data-testid="dialog-video-call">
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
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-background/50 rounded border border-border text-sm font-mono text-muted-foreground overflow-hidden" data-testid="text-shareable-link">
                    <span className="hidden sm:inline">{window.location.origin}/join/</span>
                    <span className="sm:hidden">peacepad.com/join/</span>
                    <span className="font-bold text-primary">{sessionCode}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={shareViaSystem}
                      data-testid="button-share"
                      className="gap-2 flex-1 sm:flex-none"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyShareableLink}
                      data-testid="button-copy-link"
                      className="gap-2 flex-1 sm:flex-none"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
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
              className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
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
