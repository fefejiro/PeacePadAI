import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Phone, Video, Paperclip, Mic, Camera, X, FileText, Image as ImageIcon } from "lucide-react";
import MessageBubble from "./MessageBubble";
import VideoCallDialog from "./VideoCallDialog";
import { type ToneType } from "./TonePill";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

type MessageWithSender = Message & {
  senderDisplayName?: string;
  senderFirstName?: string;
  senderLastName?: string;
};

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

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

  const sendTextMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", { content });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setMessage("");
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

      const res = await apiRequest("POST", "/api/messages", {
        content: file.name,
        messageType: fileData.messageType,
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        duration: fileData.duration,
      });
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setSelectedFile(null);
      setFilePreviewUrl(null);
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

  const handleSend = () => {
    if (selectedFile) {
      const messageType = selectedFile.type.startsWith('image/') ? 'image' :
                         selectedFile.type.startsWith('video/') ? 'video' :
                         selectedFile.type.startsWith('audio/') ? 'audio' : 'document';
      sendMediaMessage.mutate({ file: selectedFile, messageType });
    } else if (message.trim()) {
      sendTextMessage.mutate(message);
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

      const mediaRecorder = new MediaRecorder(stream);
      audioRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        
        sendMediaMessage.mutate({ file, messageType: 'audio' });
        
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
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoStreamRef.current = stream;
      videoChunksRef.current = [];

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      videoRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
        
        sendMediaMessage.mutate({ file, messageType: 'video' });
        
        stream.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecordingVideo(true);
      
      toast({
        title: "Recording started",
        description: "Recording video message...",
      });
    } catch (error) {
      console.error("Failed to start video recording:", error);
      toast({
        title: "Recording failed",
        description: "Could not access camera",
        variant: "destructive",
      });
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);
    }
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <h2 className="text-lg font-semibold text-foreground">Chat</h2>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="secondary"
            onClick={startAudioCall}
            data-testid="button-start-audio-call"
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={startVideoCall}
            data-testid="button-start-video-call"
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
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

      {/* Video Recording Preview */}
      {isRecordingVideo && (
        <div className="p-4 bg-card border-t">
          <div className="max-w-md mx-auto">
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              className="w-full rounded-lg"
            />
            <Button
              onClick={stopVideoRecording}
              className="w-full mt-2"
              variant="destructive"
              data-testid="button-stop-video-recording"
            >
              Stop Recording
            </Button>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 p-4 bg-background border-t">
        <div className="max-w-4xl mx-auto">
          {/* File Preview */}
          {selectedFile && (
            <div className="mb-3 p-3 bg-card border border-card-border rounded-lg flex items-center gap-3">
              {filePreviewUrl && selectedFile.type.startsWith('image/') ? (
                <img src={filePreviewUrl} alt="Preview" className="h-16 w-16 object-cover rounded" />
              ) : selectedFile.type.startsWith('video/') ? (
                <video src={filePreviewUrl || undefined} className="h-16 w-16 object-cover rounded" />
              ) : (
                <FileText className="h-16 w-16 text-muted-foreground" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={clearFileSelection}
                data-testid="button-clear-file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="relative rounded-xl shadow-lg bg-card border border-card-border">
            <div className="flex items-end gap-2 p-2">
              {/* File Attachment Button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
                data-testid="button-attach-file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              {/* Audio Recording Button */}
              <Button
                size="icon"
                variant={isRecordingAudio ? "destructive" : "ghost"}
                onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                className="shrink-0"
                data-testid="button-record-audio"
              >
                <Mic className="h-4 w-4" />
              </Button>

              {/* Video Recording Button */}
              <Button
                size="icon"
                variant={isRecordingVideo ? "destructive" : "ghost"}
                onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                className="shrink-0"
                data-testid="button-record-video"
              >
                <Camera className="h-4 w-4" />
              </Button>

              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="resize-none border-0 text-base focus-visible:ring-0 min-h-[48px] flex-1"
                data-testid="input-message"
                disabled={sendTextMessage.isPending || sendMediaMessage.isPending || !!selectedFile}
              />

              <Button
                size="icon"
                onClick={handleSend}
                disabled={(!message.trim() && !selectedFile) || sendTextMessage.isPending || sendMediaMessage.isPending}
                className="shrink-0"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
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
              : "AI will analyze your message tone after sending"}
          </p>
        </div>
      </div>
    </div>
  );
}
