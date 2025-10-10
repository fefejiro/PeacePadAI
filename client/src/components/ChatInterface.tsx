import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Phone, Video } from "lucide-react";
import MessageBubble from "./MessageBubble";
import VideoCallDialog from "./VideoCallDialog";
import { type ToneType } from "./TonePill";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const sendMessage = useMutation({
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

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage.mutate(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
              
              // For co-parent messages, show a friendly name
              // If it starts with "Guest", show "Guest User" instead
              const displayName = user?.displayName || user?.firstName || "Co-parent";
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

      <div className="sticky bottom-0 p-4 bg-background border-t">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-xl shadow-lg bg-card border border-card-border">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="resize-none border-0 text-base focus-visible:ring-0 pr-12 min-h-[60px]"
              data-testid="input-message"
              disabled={sendMessage.isPending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending}
              className="absolute bottom-2 right-2"
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {sendMessage.isPending ? "Analyzing tone..." : "AI will analyze your message tone after sending"}
          </p>
        </div>
      </div>
    </div>
  );
}
