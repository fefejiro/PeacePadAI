import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TonePill, { type ToneType } from "./TonePill";

interface MessageBubbleProps {
  content: string;
  sender: "me" | "coparent";
  timestamp: string;
  senderName: string;
  senderAvatar?: string;
  tone?: ToneType;
  toneSummary?: string;
}

export default function MessageBubble({
  content,
  sender,
  timestamp,
  senderName,
  senderAvatar,
  tone,
  toneSummary,
}: MessageBubbleProps) {
  const isMe = sender === "me";

  return (
    <div className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={senderAvatar} alt={senderName} />
        <AvatarFallback>{senderName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">
            {senderName}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            {timestamp}
          </span>
        </div>

        <div
          className={`rounded-2xl px-4 py-3 ${
            isMe
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground border border-card-border"
          }`}
          data-testid={`message-${sender}`}
        >
          <p className="text-base leading-relaxed">{content}</p>
        </div>

        {tone && (
          <TonePill tone={tone} summary={toneSummary || ""} />
        )}
      </div>
    </div>
  );
}
