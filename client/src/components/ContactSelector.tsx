import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Search, Phone, Video, MessageSquare, Mic, UserPlus, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface AvailableUser {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  phoneNumber: string | null;
}

interface ContactSelectorProps {
  onSelectContact: (contact: Contact) => void;
  selectedContactId?: string;
}

export function ContactSelector({ onSelectContact, selectedContactId }: ContactSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: !!user,
  });

  const { data: availableUsers = [], isLoading: isLoadingAvailable } = useQuery<AvailableUser[]>({
    queryKey: ["/api/available-users"],
    enabled: !!user && isOpen,
  });

  const addContactMutation = useMutation({
    mutationFn: async (peerUserId: string) => {
      const res = await apiRequest("POST", "/api/contacts", {
        peerUserId,
        allowAudio: true,
        allowVideo: true,
        allowSms: false,
        allowRecording: false,
        allowAiTone: true,
        nickname: null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/available-users"] });
      toast({
        title: "Contact added",
        description: "The contact has been added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive",
      });
    },
  });

  const filteredContacts = contacts.filter((contact) => {
    if (!contact.peerUser) return false;
    const displayName = contact.nickname || contact.peerUser.displayName || "";
    const phoneNumber = contact.peerUser.phoneNumber || "";
    const query = searchQuery.toLowerCase();
    return (
      displayName.toLowerCase().includes(query) ||
      phoneNumber.toLowerCase().includes(query)
    );
  });

  const filteredAvailableUsers = availableUsers.filter((user) => {
    if (!user?.displayName) return false;
    const query = searchQuery.toLowerCase();
    return user.displayName.toLowerCase().includes(query);
  });

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  const handleSelectContact = (contact: Contact) => {
    onSelectContact(contact);
    setIsOpen(false);
  };

  const handleAddContact = (userId: string) => {
    addContactMutation.mutate(userId);
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
          <DialogTitle>Select or Add Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-contacts"
            />
          </div>

          <Tabs defaultValue="contacts" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="contacts" data-testid="tab-contacts">
                My Contacts ({contacts.length})
              </TabsTrigger>
              <TabsTrigger value="add" data-testid="tab-add-contact">
                Add Contact ({availableUsers.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="contacts" className="mt-4">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {isLoadingContacts ? (
                  <div className="text-center py-8 text-muted-foreground">Loading contacts...</div>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-contacts">
                    {searchQuery ? "No contacts found matching your search" : "No contacts yet. Add someone from the 'Add Contact' tab."}
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
            </TabsContent>
            <TabsContent value="add" className="mt-4">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {isLoadingAvailable ? (
                  <div className="text-center py-8 text-muted-foreground">Loading available users...</div>
                ) : filteredAvailableUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-available-users">
                    {searchQuery ? "No users found matching your search" : "No other users available to add"}
                  </div>
                ) : (
                  filteredAvailableUsers.map((availableUser) => (
                    <Card
                      key={availableUser.id}
                      className="p-3"
                      data-testid={`available-user-card-${availableUser.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {getAvatarContent(availableUser.profileImageUrl)}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate" data-testid={`available-user-name-${availableUser.id}`}>
                            {availableUser.displayName}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddContact(availableUser.id)}
                          disabled={addContactMutation.isPending}
                          data-testid={`button-add-${availableUser.id}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
