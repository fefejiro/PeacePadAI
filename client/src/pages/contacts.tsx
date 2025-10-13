import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Users, UserPlus, Settings as SettingsIcon, Trash2, Phone, Video, MessageSquare, Mic, Brain, User } from "lucide-react";

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

interface UserData {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  phoneNumber: string | null;
}

export default function ContactsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editAllowAudio, setEditAllowAudio] = useState(true);
  const [editAllowVideo, setEditAllowVideo] = useState(true);
  const [editAllowSms, setEditAllowSms] = useState(false);
  const [editAllowRecording, setEditAllowRecording] = useState(false);
  const [editAllowAiTone, setEditAllowAiTone] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: contacts = [], isLoading: loadingContacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: !!user, // Only fetch when user is authenticated
  });

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery<UserData[]>({
    queryKey: ["/api/users"],
  });

  const availableUsers = allUsers.filter(
    (u) => u.id !== user?.id && !contacts.some((c) => c.peerUserId === u.id)
  );

  const addContact = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/contacts", {
        peerUserId: selectedUserId,
      });
      return await res.json();
    },
    onSuccess: async (newContact) => {
      // Fetch the peer user info to add to the new contact
      const peerUser = allUsers.find(u => u.id === selectedUserId);
      const contactWithUser = {
        ...newContact,
        peerUser: peerUser || null
      };
      
      // Optimistically update the query data
      queryClient.setQueryData<Contact[]>(["/api/contacts"], (old = []) => {
        return [...old, contactWithUser];
      });
      
      setIsAddDialogOpen(false);
      setSelectedUserId("");
      toast({ title: "Contact added successfully" });
      
      // Refetch to get server's version of the data
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive",
      });
    },
  });

  const updateContact = useMutation({
    mutationFn: async (contactId: string) => {
      const res = await apiRequest("PATCH", `/api/contacts/${contactId}`, {
        nickname: editNickname || null,
        allowAudio: editAllowAudio,
        allowVideo: editAllowVideo,
        allowSms: editAllowSms,
        allowRecording: editAllowRecording,
        allowAiTone: editAllowAiTone,
      });
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ["/api/contacts"] });
      setEditingContactId(null);
      toast({ title: "Contact updated successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (contactId: string) => {
      const res = await apiRequest("DELETE", `/api/contacts/${contactId}`);
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Contact deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      });
    },
  });

  const startEditContact = (contact: Contact) => {
    setEditingContactId(contact.id);
    setEditNickname(contact.nickname || "");
    setEditAllowAudio(contact.allowAudio);
    setEditAllowVideo(contact.allowVideo);
    setEditAllowSms(contact.allowSms);
    setEditAllowRecording(contact.allowRecording);
    setEditAllowAiTone(contact.allowAiTone);
  };

  const cancelEdit = () => {
    setEditingContactId(null);
    setEditNickname("");
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
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Contacts</h1>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-contact">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-add-contact">
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger data-testid="select-user">
                    <SelectValue placeholder="Choose a user to add as contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id} data-testid={`user-option-${u.id}`}>
                        {u.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => addContact.mutate()}
                disabled={!selectedUserId || addContact.isPending}
                className="w-full"
                data-testid="button-confirm-add-contact"
              >
                {addContact.isPending ? "Adding..." : "Add Contact"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {loadingContacts ? (
          <div className="text-center py-8 text-muted-foreground">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground" data-testid="text-no-contacts-page">
                No contacts yet. Add your first contact to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          contacts.map((contact) => (
            <Card key={contact.id} data-testid={`contact-card-page-${contact.peerUserId}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {getAvatarContent(contact.peerUser?.profileImageUrl || null)}
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold" data-testid={`contact-name-page-${contact.peerUserId}`}>
                        {contact.nickname || contact.peerUser?.displayName}
                      </h3>
                      {contact.peerUser?.phoneNumber && (
                        <a
                          href={`tel:${contact.peerUser.phoneNumber}`}
                          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                          data-testid={`contact-phone-page-${contact.peerUserId}`}
                        >
                          <Phone className="h-3 w-3" />
                          {contact.peerUser.phoneNumber}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => startEditContact(contact)}
                      data-testid={`button-edit-${contact.peerUserId}`}
                    >
                      <SettingsIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => deleteContact.mutate(contact.id)}
                      data-testid={`button-delete-${contact.peerUserId}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {editingContactId === contact.id ? (
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nickname (Optional)</Label>
                    <Input
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      placeholder="Enter a nickname"
                      data-testid={`input-nickname-${contact.peerUserId}`}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Permissions</Label>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Audio Calls</span>
                      </div>
                      <Switch
                        checked={editAllowAudio}
                        onCheckedChange={setEditAllowAudio}
                        data-testid={`switch-audio-${contact.peerUserId}`}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Video Calls</span>
                      </div>
                      <Switch
                        checked={editAllowVideo}
                        onCheckedChange={setEditAllowVideo}
                        data-testid={`switch-video-${contact.peerUserId}`}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">SMS Messages</span>
                      </div>
                      <Switch
                        checked={editAllowSms}
                        onCheckedChange={setEditAllowSms}
                        data-testid={`switch-sms-${contact.peerUserId}`}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Call Recording</span>
                      </div>
                      <Switch
                        checked={editAllowRecording}
                        onCheckedChange={setEditAllowRecording}
                        data-testid={`switch-recording-${contact.peerUserId}`}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">AI Tone Analysis</span>
                      </div>
                      <Switch
                        checked={editAllowAiTone}
                        onCheckedChange={setEditAllowAiTone}
                        data-testid={`switch-ai-tone-${contact.peerUserId}`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateContact.mutate(contact.id)}
                      disabled={updateContact.isPending}
                      className="flex-1"
                      data-testid={`button-save-${contact.peerUserId}`}
                    >
                      {updateContact.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={cancelEdit}
                      className="flex-1"
                      data-testid={`button-cancel-${contact.peerUserId}`}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              ) : (
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {contact.allowAudio && (
                      <Badge variant="outline" data-testid={`badge-audio-page-${contact.peerUserId}`}>
                        <Phone className="h-3 w-3 mr-1" />
                        Audio
                      </Badge>
                    )}
                    {contact.allowVideo && (
                      <Badge variant="outline" data-testid={`badge-video-page-${contact.peerUserId}`}>
                        <Video className="h-3 w-3 mr-1" />
                        Video
                      </Badge>
                    )}
                    {contact.allowSms && (
                      <Badge variant="outline" data-testid={`badge-sms-page-${contact.peerUserId}`}>
                        <MessageSquare className="h-3 w-3 mr-1" />
                        SMS
                      </Badge>
                    )}
                    {contact.allowRecording && (
                      <Badge variant="outline" data-testid={`badge-recording-page-${contact.peerUserId}`}>
                        <Mic className="h-3 w-3 mr-1" />
                        Recording
                      </Badge>
                    )}
                    {contact.allowAiTone && (
                      <Badge variant="outline" data-testid={`badge-ai-tone-page-${contact.peerUserId}`}>
                        <Brain className="h-3 w-3 mr-1" />
                        AI Tone
                      </Badge>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
