import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface TaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export default function TaskItem({ id, title, completed: initialCompleted, dueDate }: TaskItemProps) {
  const [completed, setCompleted] = useState(initialCompleted);

  const handleToggle = (checked: boolean) => {
    setCompleted(checked);
    console.log("Task toggled:", id, checked);
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover-elevate active-elevate-2">
      <Checkbox
        checked={completed}
        onCheckedChange={handleToggle}
        id={`task-${id}`}
        data-testid={`checkbox-task-${id}`}
      />
      <label
        htmlFor={`task-${id}`}
        className={`flex-1 text-sm cursor-pointer ${
          completed ? "line-through text-muted-foreground" : "text-foreground"
        }`}
      >
        {title}
      </label>
      {dueDate && (
        <span className="text-xs font-mono text-muted-foreground">{dueDate}</span>
      )}
    </div>
  );
}
