import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Users, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

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

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation | null) => void;
  selectedConversationId?: string;
}

export function ConversationList({ onSelectConversation, selectedConversationId }: ConversationListProps) {
  const { user } = useAuth();

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
  });

  // Auto-select first conversation on initial load
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      onSelectConversation(conversations[0]);
    }
  }, [conversations, selectedConversationId, onSelectConversation]);

  const getAvatarContent = (profileImageUrl: string | null) => {
    if (profileImageUrl?.startsWith("emoji:")) {
      return <div className="text-2xl">{profileImageUrl.replace("emoji:", "")}</div>;
    }
    if (profileImageUrl) {
      return <AvatarImage src={profileImageUrl} />;
    }
    return (
      <AvatarFallback>
        <User className="h-4 w-4" />
      </AvatarFallback>
    );
  };

  const getConversationLabel = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return conversation.name || 'Family Group';
    }
    // For direct messages, show the other person's name
    const otherMember = conversation.members.find((m) => m.id !== user?.id);
    return otherMember?.displayName || 'Unknown';
  };

  const getConversationSubtext = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return `${conversation.members.length} members`;
    }
    return '1:1 Chat';
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2 text-muted-foreground">
        <MessageCircle className="h-4 w-4" />
        <span className="text-sm">Loading conversations...</span>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center gap-2 p-2 text-muted-foreground">
        <MessageCircle className="h-4 w-4" />
        <span className="text-sm">No conversations yet</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1" data-testid="conversation-list">
      {conversations.map((conversation) => {
        const isSelected = conversation.id === selectedConversationId;
        const isGroup = conversation.type === 'group';
        
        return (
          <Button
            key={conversation.id}
            variant={isSelected ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-2 h-auto py-2",
              isSelected && "toggle-elevate toggle-elevated"
            )}
            onClick={() => onSelectConversation(conversation)}
            data-testid={`button-conversation-${conversation.id}`}
          >
            <Avatar className="h-8 w-8">
              {isGroup ? (
                <AvatarFallback>
                  <Users className="h-4 w-4" />
                </AvatarFallback>
              ) : (
                getAvatarContent(
                  conversation.members.find((m) => m.id !== user?.id)?.profileImageUrl || null
                )
              )}
            </Avatar>
            <div className="flex flex-col items-start flex-1 min-w-0">
              <span className="font-medium truncate w-full text-left">
                {getConversationLabel(conversation)}
              </span>
              <span className="text-xs text-muted-foreground">
                {getConversationSubtext(conversation)}
              </span>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
