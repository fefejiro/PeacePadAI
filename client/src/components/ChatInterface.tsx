import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import MessageBubble from "./MessageBubble";
import { type ToneType } from "./TonePill";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest<Message>("/api/messages", "POST", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setMessage("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              content={msg.content}
              sender={msg.senderId === user?.id ? "me" : "coparent"}
              timestamp={new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              senderName={msg.senderId === user?.id ? "You" : user?.firstName || "Co-parent"}
              tone={msg.tone as ToneType | undefined}
              toneSummary={msg.toneSummary || undefined}
            />
          ))
        )}
      </div>

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
