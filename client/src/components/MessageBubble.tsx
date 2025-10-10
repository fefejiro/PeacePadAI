import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, FileText, Download } from "lucide-react";
import TonePill, { type ToneType } from "./TonePill";
import { Button } from "@/components/ui/button";

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
          <div className="space-y-2">
            {fileUrl && (
              <audio controls className="w-full max-w-sm" data-testid="message-audio">
                <source src={fileUrl} type={mimeType || "audio/webm"} />
                Your browser does not support audio playback.
              </audio>
            )}
            {content && <p className="text-sm">{content}</p>}
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
          className={`rounded-2xl ${messageType === "text" ? "px-4 py-3" : "p-2 overflow-hidden"} ${
            isMe
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground border border-card-border"
          }`}
          data-testid={`message-${sender}`}
        >
          {renderMessageContent()}
        </div>

        {tone && (
          <div className={`flex items-center gap-2 mt-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
            {toneEmoji && <span className="text-lg" data-testid="tone-emoji">{toneEmoji}</span>}
            <TonePill tone={tone} summary={toneSummary || ""} />
          </div>
        )}

        {rewordingSuggestion && (
          <Alert className="mt-2 bg-accent/50 border-accent-border" data-testid="rewording-suggestion">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <span className="font-medium">Suggestion: </span>
              {rewordingSuggestion}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
