import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Phone, Video, Paperclip, Mic, Camera, X, FileText, Check, Trash2, Sparkles, AlertTriangle, Menu, Wifi, WifiOff, RefreshCw } from "lucide-react";
import MessageBubble from "./MessageBubble";
import VideoCallDialog from "./VideoCallDialog";
import { ConversationList } from "./ConversationList";
import { type ToneType } from "./TonePill";
import { AudioWaveform } from "./AudioWaveform";
import { AudioPlayer } from "./AudioPlayer";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type MessageWithSender = Message & {
  senderDisplayName?: string;
  senderFirstName?: string;
  senderLastName?: string;
  senderProfileImage?: string;
};

interface ConversationMember {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
}

interface Conversation {
  id: string;
  name: string | null;
  type: 'direct' | 'group';
  createdBy: string;
  createdAt: string;
  members: ConversationMember[];
}

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const conversationId = selectedConversation?.id;
  
  const { data: messages = [], isLoading } = useQuery<MessageWithSender[]>({
    queryKey: conversationId ? ["/api/conversations", conversationId, "messages"] : [],
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await fetch(`/api/conversations/${conversationId}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!conversationId,
  });

  // Auto-preview tone with debounce (1.5s after typing stops)
  useEffect(() => {
    const hasMediaReady = selectedFile || recordedAudioBlob || recordedVideoBlob;
    
    // Skip auto-preview if media is attached or message is empty
    if (!message.trim() || hasMediaReady) {
      return;
    }

    // For now, always allow AI tone analysis
    // (Partnership-level permissions can be checked if needed)

    // Skip if already previewed this exact message
    if (tonePreview && tonePreview.originalMessage.trim() === message.trim()) {
      return;
    }

    // Debounce: wait 1.5s after user stops typing
    const timeoutId = setTimeout(() => {
      previewTone.mutate(message.trim());
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [message, selectedFile, recordedAudioBlob, recordedVideoBlob]);

  const sendTextMessage = useMutation({
    mutationFn: async ({ content, conversationId }: { content: string; conversationId: string }) => {
      const res = await apiRequest("POST", "/api/messages", { content, conversationId });
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      // Invalidate all conversation-related queries using predicate
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === "/api/conversations";
        }
      });
      setMessage("");
      setTonePreview(null); // Clear preview after sending
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please refresh the page.",
          variant: "destructive",
          duration: 5000,
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
        duration: 5000,
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
        duration: 5000,
      });
    },
  });

  const sendMediaMessage = useMutation({
    mutationFn: async ({ file, messageType, duration, conversationId }: { file: File; messageType: string; duration?: number; conversationId: string }) => {
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

      const res = await apiRequest("POST", "/api/messages", {
        content: file.name,
        messageType: fileData.messageType,
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        duration: fileData.duration,
        conversationId,
      });
      
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate all conversation-related queries using predicate
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === "/api/conversations";
        }
      });
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setRecordedAudioBlob(null);
      setRecordedAudioUrl(null);
      setRecordedVideoBlob(null);
      setRecordedVideoUrl(null);
      toast({
        title: "Message sent",
        description: "Your media message was sent successfully",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to send media message",
        variant: "destructive",
        duration: 5000,
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
    if (!conversationId) return;
    
    if (selectedFile) {
      const messageType = selectedFile.type.startsWith('image/') ? 'image' :
                         selectedFile.type.startsWith('video/') ? 'video' :
                         selectedFile.type.startsWith('audio/') ? 'audio' : 'document';
      sendMediaMessage.mutate({ file: selectedFile, messageType, conversationId });
      return;
    }
    
    if (recordedAudioBlob) {
      const mimeType = recordedAudioBlob.type || 'audio/webm';
      const extension = getExtensionFromMimeType(mimeType);
      const file = new File([recordedAudioBlob], `audio-${Date.now()}.${extension}`, { type: mimeType });
      sendMediaMessage.mutate({ file, messageType: 'audio', conversationId });
      return;
    }
    
    if (recordedVideoBlob) {
      const mimeType = recordedVideoBlob.type || 'video/webm';
      const extension = getExtensionFromMimeType(mimeType);
      const file = new File([recordedVideoBlob], `video-${Date.now()}.${extension}`, { type: mimeType });
      sendMediaMessage.mutate({ file, messageType: 'video', conversationId });
      return;
    }
    
    // Text message: Apply AI-first proactive blocking
    if (message.trim()) {
      // AI tone analysis is enabled for all conversations
      
      // If force sending (user clicked "Send Anyway"), bypass check
      if (isForceSending) {
        if (!conversationId) return;
        sendTextMessage.mutate({ content: message, conversationId });
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
          if (!conversationId) return;
          sendTextMessage.mutate({ content: message, conversationId });
        } catch (error) {
          // If tone check fails, warn user but allow send
          toast({
            title: "AI Check Unavailable",
            description: "Unable to analyze message tone. Sending anyway...",
            duration: 4000,
          });
          if (!conversationId) return;
          sendTextMessage.mutate({ content: message, conversationId });
        }
      } else {
        // Already analyzed, check if concerning
        const concerningTones = ['hostile', 'defensive', 'frustrated'];
        if (tonePreview && concerningTones.includes(tonePreview.tone)) {
          setShowToneWarning(true);
          return;
        }
        
        // Safe to send
        if (!conversationId) return;
        sendTextMessage.mutate({ content: message, conversationId });
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
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to start audio recording:", error);
      toast({
        title: "Recording failed",
        description: "Could not access microphone",
        variant: "destructive",
        duration: 5000,
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
        duration: 3000,
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
        duration: 3000,
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
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to start video recording:", error);
      toast({
        title: "Recording failed",
        description: "Could not access camera. Make sure you've granted camera permissions.",
        variant: "destructive",
        duration: 5000,
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
        duration: 3000,
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
        duration: 3000,
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
    <div className="flex h-full">
      {/* Desktop Conversation List Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-80 border-r bg-card">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-foreground mb-3">Conversations</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ConversationList
            onSelectConversation={setSelectedConversation}
            selectedConversationId={selectedConversation?.id}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile & Desktop Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Mobile Conversations Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="lg:hidden h-9 w-9 shrink-0"
                  data-testid="button-mobile-conversations"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Conversations</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                  <ConversationList
                    onSelectConversation={(conv) => {
                      setSelectedConversation(conv);
                      setIsMobileMenuOpen(false);
                    }}
                    selectedConversationId={selectedConversation?.id}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex flex-col gap-1 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                {selectedConversation
                  ? selectedConversation.type === 'direct'
                    ? selectedConversation.members?.find(m => m.id !== user?.id)?.displayName || 'Chat'
                    : selectedConversation.name || 'Group Chat'
                  : 'Select a conversation'
                }
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              size="icon"
              variant="secondary"
              onClick={startAudioCall}
              className="h-9 w-9"
              data-testid="button-start-audio-call"
              disabled={!selectedConversation}
            >
              <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={startVideoCall}
              className="h-9 w-9"
              data-testid="button-start-video-call"
              disabled={!selectedConversation}
            >
              <Video className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
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
              <AudioPlayer audioUrl={recordedAudioUrl} />
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

      {/* Input Area - Mobile Optimized */}
      <div className="p-3 sm:p-4 pb-20 sm:pb-4 bg-background border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
        <div className="max-w-4xl mx-auto">
          {/* File Preview */}
          {selectedFile && (
            <div className="mb-3 p-2 sm:p-3 bg-card border rounded-lg">
              <p className="text-xs sm:text-sm font-medium mb-2">Preview attachment</p>
              <div className="flex items-center gap-2 sm:gap-3">
                {filePreviewUrl && selectedFile.type.startsWith('image/') ? (
                  <img src={filePreviewUrl} alt="Preview" className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded" />
                ) : selectedFile.type.startsWith('video/') ? (
                  <video src={filePreviewUrl || undefined} controls className="h-16 w-24 sm:h-20 sm:w-32 object-cover rounded" />
                ) : (
                  <FileText className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={sendMediaMessage.isPending}
                    className="min-h-[36px] px-3"
                    data-testid="button-send-file"
                  >
                    <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearFileSelection}
                    className="min-h-[36px] px-3"
                    data-testid="button-clear-file"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Audio Recording Indicator with Waveform */}
          {isRecordingAudio && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shrink-0"></span>
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Recording Audio</span>
                <span className="text-xs text-red-600 dark:text-red-400 ml-auto">
                  {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="bg-background rounded-md mb-3 overflow-hidden">
                <AudioWaveform 
                  stream={audioStreamRef.current} 
                  isRecording={true}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  onClick={stopAudioRecording}
                  className="min-h-[36px]"
                  data-testid="button-stop-audio-recording"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Stop & Review
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelAudioRecording}
                  className="min-h-[36px]"
                  data-testid="button-cancel-audio-recording"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="relative rounded-xl shadow-lg bg-card border">
            <div className="flex items-center gap-1 sm:gap-1.5 p-2 sm:p-2.5">
              {/* File Attachment Button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 h-10 w-10 sm:h-9 sm:w-9"
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
                className="shrink-0 h-10 w-10 sm:h-9 sm:w-9"
                disabled={hasAnyMediaReady || isRecordingVideo}
                data-testid="button-record-audio"
              >
                <Mic className="h-5 w-5" />
              </Button>

              {/* Video Recording Button - Hidden on small screens */}
              <Button
                size="icon"
                variant={isRecordingVideo ? "destructive" : "ghost"}
                onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                className="hidden sm:flex shrink-0 h-10 w-10 sm:h-9 sm:w-9"
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
                className="resize-none border-0 text-sm sm:text-base focus-visible:ring-0 min-h-[44px] sm:min-h-[40px] max-h-[120px] flex-1 self-center"
                data-testid="input-message"
                disabled={sendTextMessage.isPending || sendMediaMessage.isPending || hasAnyMediaReady || isRecordingAudio || isRecordingVideo}
              />

              {/* AI Check Tone Button - Hidden on mobile */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (message.trim()) {
                    previewTone.mutate(message.trim());
                  }
                }}
                disabled={!message.trim() || previewTone.isPending || hasAnyMediaReady}
                className="hidden sm:flex shrink-0 h-10 w-10 sm:h-9 sm:w-9"
                data-testid="button-check-tone"
                title="Check tone with AI"
              >
                <Sparkles className={`h-5 w-5 ${previewTone.isPending ? 'animate-pulse' : ''}`} />
              </Button>

              <Button
                size="icon"
                onClick={handleSend}
                disabled={(!message.trim() && !hasAnyMediaReady) || sendTextMessage.isPending || sendMediaMessage.isPending || isRecordingAudio || isRecordingVideo}
                className="shrink-0 h-10 w-10 sm:h-9 sm:w-9"
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

          <p className="text-xs text-muted-foreground mt-2 text-center hidden sm:block">
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
    </div>
  );
}
