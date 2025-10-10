import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import NoteCard from "./NoteCard";
import TaskList from "./TaskList";
import ChildUpdateCard from "./ChildUpdateCard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Note, ChildUpdate } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const { toast } = useToast();
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const { data: updates = [] } = useQuery<ChildUpdate[]>({
    queryKey: ["/api/child-updates"],
  });

  const createNote = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const res = await apiRequest("POST", "/api/notes", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setNoteDialogOpen(false);
      setNoteTitle("");
      setNoteContent("");
      toast({ title: "Note created successfully" });
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
      toast({ title: "Error", description: "Failed to create note", variant: "destructive" });
    },
  });

  const handleAddNote = () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    createNote.mutate({ title: noteTitle, content: noteContent });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground">Family Dashboard</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-foreground">Shared Notes</h2>
            <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-add-note"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="note-title">Title</Label>
                    <Input
                      id="note-title"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Note title"
                      data-testid="input-note-title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="note-content">Content</Label>
                    <Textarea
                      id="note-content"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Note content"
                      data-testid="input-note-content"
                    />
                  </div>
                  <Button
                    onClick={handleAddNote}
                    disabled={createNote.isPending}
                    data-testid="button-save-note"
                  >
                    Create Note
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {notes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No notes yet. Create one to get started!</p>
            ) : (
              notes.map((note) => (
                <NoteCard
                  key={note.id}
                  id={note.id}
                  title={note.title}
                  content={note.content}
                  createdBy="You"
                  date={new Date(note.createdAt).toLocaleDateString()}
                />
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <TaskList />
          
          <div className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">Child Updates</h2>
            <div className="space-y-3">
              {updates.length === 0 ? (
                <p className="text-muted-foreground text-sm">No updates yet.</p>
              ) : (
                updates.map((update) => (
                  <ChildUpdateCard
                    key={update.id}
                    childName={update.childName}
                    update={update.update}
                    author="You"
                    timestamp={new Date(update.createdAt).toLocaleString()}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
