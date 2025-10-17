import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Phone, Video, Paperclip, Mic, Camera, X, FileText, Check, Trash2, Sparkles, AlertTriangle } from "lucide-react";
import MessageBubble from "./MessageBubble";
import VideoCallDialog from "./VideoCallDialog";
import { CoParentSelector } from "./CoParentSelector";
import { type ToneType } from "./TonePill";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useActivity } from "@/components/ActivityProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type MessageWithSender = Message & {
  senderDisplayName?: string;
  senderFirstName?: string;
  senderLastName?: string;
  senderProfileImage?: string;
};

interface Partnership {
  id: string;
  user1Id: string;
  user2Id: string;
  inviteCode: string;
  allowAudio: boolean;
  allowVideo: boolean;
  allowRecording: boolean;
  allowAiTone: boolean;
  createdAt: string;
  updatedAt: string;
  coParent: {
    id: string;
    displayName: string;
    profileImageUrl: string | null;
    phoneNumber: string | null;
  } | null;
}

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [tonePreview, setTonePreview] = useState<{
    tone: string;
    summary: string;
    emoji: string;
    rewordingSuggestion: string | null;
    originalMessage: string;
  } | null>(null);
  const [showToneWarning, setShowToneWarning] = useState(false);
  const [isForceSending, setIsForceSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackActivity, endActivity } = useActivity();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const recordedVideoPreviewRef = useRef<HTMLVideoElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: messages = [], isLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/messages"],
  });

  // WebSocket connection for real-time message updates
  useEffect(() => {
    if (!user) return;

    const sessionId = localStorage.getItem("peacepad_session_id") || user.id;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/signaling?sessionId=${sessionId}&userId=${user.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected for real-time messages");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new-message") {
          queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, [user]);

  // Auto-preview tone with debounce (1.5s after typing stops)
  useEffect(() => {
    const hasMediaReady = selectedFile || recordedAudioBlob || recordedVideoBlob;
    
    // Skip auto-preview if media is attached or message is empty
    if (!message.trim() || hasMediaReady) {
      return;
    }

    // Skip if AI tone analysis is disabled for this partnership
    if (selectedPartnership && !selectedPartnership.allowAiTone) {
      return;
    }

    // Skip if already previewed this exact message
    if (tonePreview && tonePreview.originalMessage.trim() === message.trim()) {
      return;
    }

    // Debounce: wait 1.5s after user stops typing
    const timeoutId = setTimeout(() => {
      previewTone.mutate(message.trim());
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [message, selectedFile, recordedAudioBlob, recordedVideoBlob, selectedPartnership]);

  const sendTextMessage = useMutation({
    mutationFn: async (content: string) => {
      const recipientId = selectedPartnership?.coParent?.id;
      const res = await apiRequest("POST", "/api/messages", { content, recipientId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setMessage("");
      setTonePreview(null); // Clear preview after sending
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please refresh the page.",
          variant: "destructive",
        });
        localStorage.removeItem("peacepad_session_id");
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // AI-first: Preview tone BEFORE sending
  const previewTone = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages/preview", { content });
      return await res.json();
    },
    onSuccess: (data) => {
      // Only set preview if message hasn't changed (prevent stale previews from race conditions)
      if (message.trim() === data.originalMessage.trim()) {
        setTonePreview(data);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to analyze message tone. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendMediaMessage = useMutation({
    mutationFn: async ({ file, messageType, duration }: { file: File; messageType: string; duration?: number }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('messageType', messageType);
      if (duration) formData.append('duration', duration.toString());

      const uploadRes = await fetch('/api/chat-attachments', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!uploadRes.ok) throw new Error('Failed to upload file');
      const fileData = await uploadRes.json();

      const recipientId = selectedPartnership?.coParent?.id;
      const res = await apiRequest("POST", "/api/messages", {
        content: file.name,
        messageType: fileData.messageType,
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        duration: fileData.duration,
        recipientId,
      });
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setRecordedAudioBlob(null);
      setRecordedAudioUrl(null);
      setRecordedVideoBlob(null);
      setRecordedVideoUrl(null);
      toast({
        title: "Message sent",
        description: "Your media message was sent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to send media message",
        variant: "destructive",
      });
    },
  });

  // Helper to get file extension from MIME type
  const getExtensionFromMimeType = (mimeType: string): string => {
    // Strip codec parameters (e.g., "audio/webm;codecs=opus" -> "audio/webm")
    const baseMimeType = mimeType.split(';')[0].trim();
    
    const mimeMap: { [key: string]: string } = {
      'audio/mp4': 'mp4',
      'audio/m4a': 'm4a',
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/ogg': 'ogg',
    };
    return mimeMap[baseMimeType] || baseMimeType.split('/')[1] || 'webm';
  };

  const handleSend = async () => {
    // Track messaging activity
    trackActivity('messaging');
    
    // Media messages bypass tone check
    if (selectedFile) {
      const messageType = selectedFile.type.startsWith('image/') ? 'image' :
                         selectedFile.type.startsWith('video/') ? 'video' :
                         selectedFile.type.startsWith('audio/') ? 'audio' : 'document';
      sendMediaMessage.mutate({ file: selectedFile, messageType });
      return;
    }
    
    if (recordedAudioBlob) {
      const mimeType = recordedAudioBlob.type || 'audio/webm';
      const extension = getExtensionFromMimeType(mimeType);
      const file = new File([recordedAudioBlob], `audio-${Date.now()}.${extension}`, { type: mimeType });
      sendMediaMessage.mutate({ file, messageType: 'audio' });
      return;
    }
    
    if (recordedVideoBlob) {
      const mimeType = recordedVideoBlob.type || 'video/webm';
      const extension = getExtensionFromMimeType(mimeType);
      const file = new File([recordedVideoBlob], `video-${Date.now()}.${extension}`, { type: mimeType });
      sendMediaMessage.mutate({ file, messageType: 'video' });
      return;
    }
    
    // Text message: Apply AI-first proactive blocking
    if (message.trim()) {
      // If AI tone analysis is disabled for this partnership, send directly
      if (selectedPartnership && !selectedPartnership.allowAiTone) {
        sendTextMessage.mutate(message);
        return;
      }
      
      // If force sending (user clicked "Send Anyway"), bypass check
      if (isForceSending) {
        sendTextMessage.mutate(message);
        setIsForceSending(false);
        return;
      }
      
      // Check if we need to analyze tone
      const needsToneCheck = !tonePreview || tonePreview.originalMessage.trim() !== message.trim();
      
      if (needsToneCheck) {
        // Analyze tone before sending
        try {
          const res = await apiRequest("POST", "/api/messages/preview", { content: message.trim() });
          const toneData = await res.json();
          
          // Check if tone is concerning
          const concerningTones = ['hostile', 'defensive', 'frustrated'];
          if (concerningTones.includes(toneData.tone)) {
            // Block send and show warning
            setTonePreview(toneData);
            setShowToneWarning(true);
            return;
          }
          
          // Tone is safe, proceed with send
          sendTextMessage.mutate(message);
        } catch (error) {
          // If tone check fails, warn user but allow send
          toast({
            title: "AI Check Unavailable",
            description: "Unable to analyze message tone. Sending anyway...",
          });
          sendTextMessage.mutate(message);
        }
      } else {
        // Already analyzed, check if concerning
        const concerningTones = ['hostile', 'defensive', 'frustrated'];
        if (tonePreview && concerningTones.includes(tonePreview.tone)) {
          setShowToneWarning(true);
          return;
        }
        
        // Safe to send
        sendTextMessage.mutate(message);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setFilePreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      // Use compatible MIME type for better iOS support
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      audioRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedAudioBlob(blob);
        setRecordedAudioUrl(url);
        
        stream.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      
      toast({
        title: "Recording started",
        description: "Recording audio message...",
      });
    } catch (error) {
      console.error("Failed to start audio recording:", error);
      toast({
        title: "Recording failed",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecordingAudio) {
      audioRecorderRef.current.stop();
      setIsRecordingAudio(false);
      toast({
        title: "Recording stopped",
        description: "Review your audio message",
      });
    }
  };

  const cancelAudioRecording = () => {
    if (isRecordingAudio && audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      toast({
        title: "Recording cancelled",
        description: "Audio recording discarded",
      });
    }
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      videoStreamRef.current = stream;
      videoChunksRef.current = [];

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(err => console.error("Video play error:", err));
      }

      const mediaRecorder = new MediaRecorder(stream);
      videoRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'video/webm';
        const blob = new Blob(videoChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedVideoBlob(blob);
        setRecordedVideoUrl(url);
        
        stream.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
        
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };

      mediaRecorder.start();
      setIsRecordingVideo(true);
      setRecordingDuration(0);
      
      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording started",
        description: "Recording video message...",
      });
    } catch (error) {
      console.error("Failed to start video recording:", error);
      toast({
        title: "Recording failed",
        description: "Could not access camera. Make sure you've granted camera permissions.",
        variant: "destructive",
      });
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      toast({
        title: "Recording stopped",
        description: "Review your video message",
      });
    }
  };

  const cancelVideoRecording = () => {
    if (isRecordingVideo && videoRecorderRef.current) {
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingDuration(0);
      
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
      toast({
        title: "Recording cancelled",
        description: "Video recording discarded",
      });
    }
    setRecordedVideoBlob(null);
    setRecordedVideoUrl(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  const startAudioCall = () => {
    setCallType("audio");
    setIsCallDialogOpen(true);
  };

  const startVideoCall = () => {
    setCallType("video");
    setIsCallDialogOpen(true);
  };

  const hasAnyMediaReady = !!(selectedFile || recordedAudioBlob || recordedVideoBlob);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-3 p-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Chat</h2>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={startAudioCall}
              className="h-9 w-9 flex items-center justify-center"
              data-testid="button-start-audio-call"
              disabled={!selectedPartnership?.allowAudio}
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={startVideoCall}
              className="h-9 w-9 flex items-center justify-center"
              data-testid="button-start-video-call"
              disabled={!selectedPartnership?.allowVideo}
            >
              <Video className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <CoParentSelector
          onSelectPartnership={setSelectedPartnership}
          selectedPartnershipId={selectedPartnership?.id}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const getSenderName = () => {
              if (msg.senderId === user?.id) return "You";
              
              const displayName = msg.senderDisplayName || 
                (msg.senderFirstName && msg.senderLastName 
                  ? `${msg.senderFirstName} ${msg.senderLastName}` 
                  : msg.senderFirstName || "Guest User");
              
              if (displayName.startsWith("Guest")) {
                return "Guest User";
              }
              return displayName;
            };

            return (
              <MessageBubble
                key={msg.id}
                content={msg.content}
                sender={msg.senderId === user?.id ? "me" : "coparent"}
                timestamp={new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                senderName={getSenderName()}
                senderAvatar={msg.senderProfileImage || undefined}
                tone={msg.tone as ToneType | undefined}
                toneSummary={msg.toneSummary || undefined}
                toneEmoji={msg.toneEmoji || undefined}
                rewordingSuggestion={msg.rewordingSuggestion || undefined}
                messageType={msg.messageType || "text"}
                fileUrl={msg.fileUrl || undefined}
                fileName={msg.fileName || undefined}
                mimeType={msg.mimeType || undefined}
              />
            );
          })
        )}
      </div>

      <VideoCallDialog
        isOpen={isCallDialogOpen}
        onClose={() => setIsCallDialogOpen(false)}
        callType={callType}
        recipientId="co-parent-id"
      />

      {/* AI Proactive Blocking Warning */}
      <AlertDialog open={showToneWarning} onOpenChange={setShowToneWarning}>
        <AlertDialogContent data-testid="dialog-tone-warning">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              This Message May Escalate Conflict
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {tonePreview && (
                <>
                  <p>
                    AI detected a <strong className="capitalize">{tonePreview.tone}</strong> tone: "{tonePreview.summary}"
                  </p>
                  
                  {tonePreview.rewordingSuggestion && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium text-primary mb-2">AI Suggests:</p>
                      <p className="text-sm text-foreground italic">"{tonePreview.rewordingSuggestion}"</p>
                    </div>
                  )}
                  
                  <p className="text-muted-foreground text-xs">
                    Hostile messages can harm your co-parenting relationship and affect your children. Consider using the AI suggestion to communicate more constructively.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel data-testid="button-edit-message">
              Edit Message
            </AlertDialogCancel>
            {tonePreview?.rewordingSuggestion && (
              <Button
                onClick={() => {
                  setMessage(tonePreview.rewordingSuggestion || "");
                  setTonePreview(null);
                  setShowToneWarning(false);
                }}
                variant="outline"
                data-testid="button-use-ai-rewrite"
              >
                <Check className="h-4 w-4 mr-2" />
                Use AI Rewrite
              </Button>
            )}
            <AlertDialogAction
              onClick={() => {
                setIsForceSending(true);
                setShowToneWarning(false);
                // Trigger send immediately after closing dialog
                setTimeout(() => handleSend(), 0);
              }}
              className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
              data-testid="button-send-anyway"
            >
              Send Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Video Recording Live Preview */}
      {isRecordingVideo && (
        <div className="p-4 bg-card border-t">
          <div className="max-w-md mx-auto space-y-3">
            <p className="text-sm font-medium flex items-center justify-between">
              <span>Recording video...</span>
              <span className="text-red-500 font-mono">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
            </p>
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video object-cover"
              />
              <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                REC
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={stopVideoRecording}
                className="flex-1"
                data-testid="button-stop-video-recording"
              >
                <Check className="h-4 w-4 mr-2" />
                Stop & Review
              </Button>
              <Button
                onClick={cancelVideoRecording}
                variant="destructive"
                className="flex-1"
                data-testid="button-cancel-video-recording"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recorded Video Preview */}
      {recordedVideoBlob && recordedVideoUrl && !isRecordingVideo && (
        <div className="p-4 bg-card border-t">
          <div className="max-w-md mx-auto space-y-3">
            <p className="text-sm font-medium">Review your video message</p>
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                ref={recordedVideoPreviewRef}
                src={recordedVideoUrl}
                controls
                playsInline
                className="w-full aspect-video object-cover"
                data-testid="video-preview"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSend}
                disabled={sendMediaMessage.isPending}
                className="flex-1"
                data-testid="button-send-video"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendMediaMessage.isPending ? "Sending..." : "Send Video"}
              </Button>
              <Button
                onClick={cancelVideoRecording}
                variant="outline"
                className="flex-1"
                data-testid="button-delete-video"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recorded Audio Preview */}
      {recordedAudioBlob && recordedAudioUrl && !isRecordingAudio && (
        <div className="p-4 bg-card border-t">
          <div className="max-w-md mx-auto space-y-3">
            <p className="text-sm font-medium">Review your audio message</p>
            <div className="p-3 bg-muted rounded-lg">
              <audio 
                src={recordedAudioUrl} 
                controls 
                className="w-full" 
                data-testid="audio-preview"
                onError={(e) => {
                  console.error("Audio playback error:", e);
                  toast({
                    title: "Playback issue",
                    description: "Audio format may not be supported on this device",
                    variant: "destructive",
                  });
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSend}
                disabled={sendMediaMessage.isPending}
                className="flex-1"
                data-testid="button-send-audio"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendMediaMessage.isPending ? "Sending..." : "Send Audio"}
              </Button>
              <Button
                onClick={cancelAudioRecording}
                variant="outline"
                className="flex-1"
                data-testid="button-delete-audio"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-background border-t">
        <div className="max-w-4xl mx-auto">
          {/* File Preview */}
          {selectedFile && (
            <div className="mb-3 p-3 bg-card border border-card-border rounded-lg">
              <p className="text-sm font-medium mb-2">Preview attachment</p>
              <div className="flex items-center gap-3">
                {filePreviewUrl && selectedFile.type.startsWith('image/') ? (
                  <img src={filePreviewUrl} alt="Preview" className="h-20 w-20 object-cover rounded" />
                ) : selectedFile.type.startsWith('video/') ? (
                  <video src={filePreviewUrl || undefined} controls className="h-20 w-32 object-cover rounded" />
                ) : (
                  <FileText className="h-20 w-20 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={sendMediaMessage.isPending}
                    className="flex items-center justify-center gap-2"
                    data-testid="button-send-file"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearFileSelection}
                    className="flex items-center justify-center gap-2"
                    data-testid="button-clear-file"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Audio Recording Indicator */}
          {isRecordingAudio && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Recording audio...</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={stopAudioRecording}
                  className="flex items-center gap-2"
                  data-testid="button-stop-audio-recording"
                >
                  <Check className="h-4 w-4" />
                  Stop
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelAudioRecording}
                  className="flex items-center gap-2"
                  data-testid="button-cancel-audio-recording"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="relative rounded-xl shadow-lg bg-card border border-card-border">
            <div className="flex items-center gap-1.5 p-2.5">
              {/* File Attachment Button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 h-9 w-9 flex items-center justify-center"
                disabled={hasAnyMediaReady || isRecordingAudio || isRecordingVideo}
                data-testid="button-attach-file"
              >
                <Paperclip className="h-5 w-5" />
              </Button>

              {/* Audio Recording Button */}
              <Button
                size="icon"
                variant={isRecordingAudio ? "destructive" : "ghost"}
                onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                className="shrink-0 h-9 w-9 flex items-center justify-center"
                disabled={hasAnyMediaReady || isRecordingVideo}
                data-testid="button-record-audio"
              >
                <Mic className="h-5 w-5" />
              </Button>

              {/* Video Recording Button */}
              <Button
                size="icon"
                variant={isRecordingVideo ? "destructive" : "ghost"}
                onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                className="shrink-0 h-9 w-9 flex items-center justify-center"
                disabled={hasAnyMediaReady || isRecordingAudio}
                data-testid="button-record-video"
              >
                <Camera className="h-5 w-5" />
              </Button>

              {/* AI Tone Preview Card */}
              {tonePreview && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border rounded-lg p-3 shadow-lg" data-testid="tone-preview-card">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{tonePreview.emoji}</span>
                      <div>
                        <p className="font-medium text-sm capitalize">Tone: {tonePreview.tone}</p>
                        <p className="text-xs text-muted-foreground">{tonePreview.summary}</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setTonePreview(null)}
                      className="h-8 w-8 shrink-0"
                      data-testid="button-close-preview"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {tonePreview.rewordingSuggestion && (
                    <div className="mt-3 p-2 bg-primary/5 rounded border border-primary/20">
                      <p className="text-xs font-medium text-primary mb-1">AI Suggests:</p>
                      <p className="text-sm">{tonePreview.rewordingSuggestion}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMessage(tonePreview.rewordingSuggestion || "");
                          setTonePreview(null);
                        }}
                        className="mt-2 text-xs"
                        data-testid="button-use-rewrite"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Use This Instead
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Textarea
                value={message}
                onChange={(e) => {
                  const newMessage = e.target.value;
                  setMessage(newMessage);
                  // Clear stale preview when user edits away from analyzed text
                  if (tonePreview && newMessage.trim() !== tonePreview.originalMessage) {
                    setTonePreview(null);
                  }
                  // Track typing activity
                  if (newMessage.trim()) {
                    trackActivity('messaging');
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="resize-none border-0 text-base focus-visible:ring-0 min-h-[40px] max-h-[120px] flex-1 self-center"
                data-testid="input-message"
                disabled={sendTextMessage.isPending || sendMediaMessage.isPending || hasAnyMediaReady || isRecordingAudio || isRecordingVideo}
              />

              {/* AI Check Tone Button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (message.trim()) {
                    previewTone.mutate(message.trim());
                  }
                }}
                disabled={!message.trim() || previewTone.isPending || hasAnyMediaReady}
                className="shrink-0 h-9 w-9 flex items-center justify-center"
                data-testid="button-check-tone"
                title="Check tone with AI"
              >
                <Sparkles className={`h-5 w-5 ${previewTone.isPending ? 'animate-pulse' : ''}`} />
              </Button>

              <Button
                size="icon"
                onClick={handleSend}
                disabled={(!message.trim() && !hasAnyMediaReady) || sendTextMessage.isPending || sendMediaMessage.isPending || isRecordingAudio || isRecordingVideo}
                className="shrink-0 h-9 w-9 flex items-center justify-center"
                data-testid="button-send-message"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            data-testid="input-file"
          />

          <p className="text-xs text-muted-foreground mt-2 text-center">
            {sendTextMessage.isPending || sendMediaMessage.isPending 
              ? "Sending..." 
              : isRecordingAudio
              ? "Recording audio... Click stop to review"
              : isRecordingVideo
              ? "Recording video... Click stop to review"
              : previewTone.isPending
              ? "AI is analyzing your message..."
              : "Click ✨ to check your message tone before sending"}
          </p>
        </div>
      </div>
    </div>
  );
}
