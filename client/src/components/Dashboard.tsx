import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import NoteCard from "./NoteCard";
import TaskList from "./TaskList";
import ChildUpdateCard from "./ChildUpdateCard";

// todo: remove mock functionality
const mockNotes = [
  {
    id: "1",
    title: "Emma's allergies",
    content: "Remember Emma is allergic to peanuts. Check all snacks before sending to school.",
    createdBy: "Alex",
    date: "Oct 8",
  },
  {
    id: "2",
    title: "Soccer practice schedule",
    content: "Practice moved to Tuesdays and Thursdays at 4 PM starting next week.",
    createdBy: "You",
    date: "Oct 10",
  },
];

const mockUpdates = [
  {
    childName: "Emma",
    update: "Had a great day at school! Got an A on her math test.",
    author: "Alex",
    timestamp: "2 hours ago",
  },
  {
    childName: "Liam",
    update: "Slept through the night for the first time this week!",
    author: "You",
    timestamp: "Yesterday",
  },
];

export default function Dashboard() {
  const handleAddNote = () => {
    console.log("Add new note");
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddNote}
              data-testid="button-add-note"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          </div>
          <div className="space-y-3">
            {mockNotes.map((note) => (
              <NoteCard key={note.id} {...note} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <TaskList />
          
          <div className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">Child Updates</h2>
            <div className="space-y-3">
              {mockUpdates.map((update, index) => (
                <ChildUpdateCard key={index} {...update} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
