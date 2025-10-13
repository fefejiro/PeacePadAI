import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Search, Phone, Video, MessageSquare, Mic, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Contact {
  id: string;
  userId: string;
  peerUserId: string;
  nickname: string | null;
  allowAudio: boolean;
  allowVideo: boolean;
  allowSms: boolean;
  allowRecording: boolean;
  allowAiTone: boolean;
  createdAt: string;
  updatedAt: string;
  peerUser: {
    id: string;
    displayName: string;
    profileImageUrl: string | null;
    phoneNumber: string | null;
  } | null;
}

interface ContactSelectorProps {
  onSelectContact: (contact: Contact) => void;
  selectedContactId?: string;
}

export function ContactSelector({ onSelectContact, selectedContactId }: ContactSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const filteredContacts = contacts.filter((contact) => {
    if (!contact.peerUser) return false;
    const displayName = contact.nickname || contact.peerUser.displayName;
    const phoneNumber = contact.peerUser.phoneNumber || "";
    const query = searchQuery.toLowerCase();
    return (
      displayName.toLowerCase().includes(query) ||
      phoneNumber.toLowerCase().includes(query)
    );
  });

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  const handleSelectContact = (contact: Contact) => {
    onSelectContact(contact);
    setIsOpen(false);
  };

  const getAvatarContent = (profileImageUrl: string | null) => {
    if (profileImageUrl?.startsWith("emoji:")) {
      return <div className="text-2xl">{profileImageUrl.replace("emoji:", "")}</div>;
    }
    if (profileImageUrl) {
      return <AvatarImage src={profileImageUrl} />;
    }
    return (
      <AvatarFallback>
        <User className="h-5 w-5" />
      </AvatarFallback>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          data-testid="button-select-contact"
        >
          {selectedContact ? (
            <>
              <Avatar className="h-6 w-6">
                {getAvatarContent(selectedContact.peerUser?.profileImageUrl || null)}
              </Avatar>
              <span className="flex-1 text-left truncate">
                {selectedContact.nickname || selectedContact.peerUser?.displayName}
              </span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              <span>Select a contact</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-contact-selector">
        <DialogHeader>
          <DialogTitle>Select Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-contacts"
            />
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading contacts...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-contacts">
                {searchQuery ? "No contacts found" : "No contacts yet"}
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <Card
                  key={contact.id}
                  className="p-3 hover-elevate cursor-pointer"
                  onClick={() => handleSelectContact(contact)}
                  data-testid={`contact-card-${contact.peerUserId}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {getAvatarContent(contact.peerUser?.profileImageUrl || null)}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" data-testid={`contact-name-${contact.peerUserId}`}>
                        {contact.nickname || contact.peerUser?.displayName}
                      </div>
                      {contact.peerUser?.phoneNumber && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span data-testid={`contact-phone-${contact.peerUserId}`}>
                            {contact.peerUser.phoneNumber}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {contact.allowAudio && (
                        <Badge variant="outline" className="px-1.5 py-0.5" data-testid={`badge-audio-${contact.peerUserId}`}>
                          <Mic className="h-3 w-3" />
                        </Badge>
                      )}
                      {contact.allowVideo && (
                        <Badge variant="outline" className="px-1.5 py-0.5" data-testid={`badge-video-${contact.peerUserId}`}>
                          <Video className="h-3 w-3" />
                        </Badge>
                      )}
                      {contact.allowSms && (
                        <Badge variant="outline" className="px-1.5 py-0.5" data-testid={`badge-sms-${contact.peerUserId}`}>
                          <MessageSquare className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
