import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, FileText, Download } from "lucide-react";
import TonePill, { type ToneType } from "./TonePill";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "./AudioPlayer";

interface MessageBubbleProps {
  content: string;
  sender: "me" | "coparent";
  timestamp: string;
  senderName: string;
  senderAvatar?: string;
  tone?: ToneType;
  toneSummary?: string;
  toneEmoji?: string;
  rewordingSuggestion?: string;
  messageType?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
}

export default function MessageBubble({
  content,
  sender,
  timestamp,
  senderName,
  senderAvatar,
  tone,
  toneSummary,
  toneEmoji,
  rewordingSuggestion,
  messageType = "text",
  fileUrl,
  fileName,
  mimeType,
}: MessageBubbleProps) {
  const isMe = sender === "me";

  const renderMessageContent = () => {
    switch (messageType) {
      case "image":
        return (
          <div className="space-y-2">
            {fileUrl && (
              <img
                src={fileUrl}
                alt={fileName || "Image"}
                className="max-w-full max-h-96 rounded-lg object-cover"
                data-testid="message-image"
              />
            )}
            {content && <p className="text-sm">{content}</p>}
          </div>
        );
      
      case "audio":
        return (
          <div className="space-y-2 min-w-[280px]">
            {fileUrl && (
              <AudioPlayer audioUrl={fileUrl} />
            )}
            {content && <p className="text-sm mt-2">{content}</p>}
          </div>
        );
      
      case "video":
        return (
          <div className="space-y-2">
            {fileUrl && (
              <video controls className="max-w-full max-h-96 rounded-lg" data-testid="message-video">
                <source src={fileUrl} type={mimeType || "video/webm"} />
                Your browser does not support video playback.
              </video>
            )}
            {content && <p className="text-sm">{content}</p>}
          </div>
        );
      
      case "document":
        return (
          <div className="flex items-center gap-3 p-2">
            <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName || content}</p>
              <p className="text-xs text-muted-foreground">{mimeType}</p>
            </div>
            {fileUrl && (
              <Button
                size="sm"
                variant="ghost"
                asChild
                data-testid="button-download-file"
              >
                <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        );
      
      default:
        return <p className="text-base leading-relaxed">{content}</p>;
    }
  };

  const isEmoji = senderAvatar?.startsWith("emoji:");
  const emojiValue = isEmoji && senderAvatar ? senderAvatar.replace("emoji:", "") : "";

  return (
    <div className={`flex gap-3 sm:gap-4 animate-slide-up ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 border-2 border-background shadow-sm">
        {isEmoji ? (
          <div className="flex items-center justify-center text-xl">{emojiValue}</div>
        ) : senderAvatar ? (
          <AvatarImage src={senderAvatar} alt={senderName} />
        ) : (
          <AvatarFallback className="bg-primary/10 text-primary font-medium">{senderName.slice(0, 2).toUpperCase()}</AvatarFallback>
        )}
      </Avatar>

      <div className={`flex flex-col max-w-[75%] sm:max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
        <div className="flex items-baseline gap-2 mb-2 px-1">
          <span className="text-sm font-medium text-foreground">
            {senderName}
          </span>
          <span className="text-xs text-muted-foreground">
            {timestamp}
          </span>
        </div>

        <div
          className={`rounded-3xl shadow-sm ${messageType === "text" ? "px-5 py-3.5" : "p-2.5 overflow-hidden"} ${
            isMe
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground border border-card-border"
          }`}
          data-testid={`message-${sender}`}
        >
          {renderMessageContent()}
        </div>

        {tone && (
          <div className={`flex items-center gap-2 mt-2 px-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
            {toneEmoji && <span className="text-base" data-testid="tone-emoji">{toneEmoji}</span>}
            <TonePill tone={tone} summary={toneSummary || ""} />
          </div>
        )}

        {rewordingSuggestion && (
          <Alert className="mt-3 bg-accent/30 border-accent/40 rounded-2xl shadow-sm animate-scale-in" data-testid="rewording-suggestion">
            <Lightbulb className="h-4 w-4 text-accent-foreground" />
            <AlertDescription className="text-sm text-accent-foreground">
              <span className="font-semibold">AI Suggests: </span>
              <span className="italic">{rewordingSuggestion}</span>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
