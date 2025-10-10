import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import MessageBubble from "./MessageBubble";
import { type ToneType } from "./TonePill";

// todo: remove mock functionality
const mockMessages = [
  {
    id: "1",
    content: "Hi, can we discuss the pickup schedule for next week? I have a work event on Thursday.",
    sender: "coparent" as const,
    timestamp: "10:23 AM",
    senderName: "Alex",
    senderAvatar: undefined,
    tone: "calm" as const,
    toneSummary: "Polite and straightforward",
  },
  {
    id: "2",
    content: "Sure, Thursday works. What time do you need me to pick them up?",
    sender: "me" as const,
    timestamp: "10:25 AM",
    senderName: "You",
    tone: "cooperative" as const,
    toneSummary: "Helpful and accommodating",
  },
  {
    id: "3",
    content: "Around 3 PM would be great. Thanks for being flexible!",
    sender: "coparent" as const,
    timestamp: "10:27 AM",
    senderName: "Alex",
    tone: "calm" as const,
    toneSummary: "Appreciative",
  },
];

interface Message {
  id: string;
  content: string;
  sender: "me" | "coparent";
  timestamp: string;
  senderName: string;
  senderAvatar?: string;
  tone?: ToneType;
  toneSummary?: string;
}

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>(mockMessages);

  const handleSend = () => {
    if (!message.trim()) return;
    
    console.log("Sending message:", message);
    
    const newMessage = {
      id: Date.now().toString(),
      content: message,
      sender: "me" as const,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: "You",
      tone: "neutral" as const,
      toneSummary: "Message sent",
    };
    
    setMessages([...messages, newMessage]);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} {...msg} />
        ))}
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
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!message.trim()}
              className="absolute bottom-2 right-2"
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI will analyze your message tone after sending
          </p>
        </div>
      </div>
    </div>
  );
}
