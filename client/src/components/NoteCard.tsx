import { Card } from "@/components/ui/card";
import { StickyNote, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoteCardProps {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  date: string;
}

export default function NoteCard({ id, title, content, createdBy, date }: NoteCardProps) {
  const handleEdit = () => {
    console.log("Edit note:", id);
  };

  const handleDelete = () => {
    console.log("Delete note:", id);
  };

  return (
    <Card className="p-4 bg-[hsl(45_95%_95%)] dark:bg-card border-[hsl(45_50%_80%)] dark:border-card-border hover-elevate">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-[hsl(45_60%_40%)]" />
          <h3 className="font-medium text-sm text-foreground">{title}</h3>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleEdit}
            data-testid={`button-edit-note-${id}`}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDelete}
            data-testid={`button-delete-note-${id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{content}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{createdBy}</span>
        <span className="font-mono">{date}</span>
      </div>
    </Card>
  );
}
