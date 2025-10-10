import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus } from "lucide-react";
import TaskItem from "./TaskItem";

// todo: remove mock functionality
const mockTasks = [
  { id: "1", title: "Schedule dentist appointment for Emma", completed: false, dueDate: "Oct 15" },
  { id: "2", title: "Buy new school shoes", completed: true, dueDate: "Oct 12" },
  { id: "3", title: "Sign permission slip for field trip", completed: false, dueDate: "Oct 18" },
];

export default function TaskList() {
  const handleAddTask = () => {
    console.log("Add new task");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Shared Tasks</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddTask}
          data-testid="button-add-task"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {mockTasks.map((task) => (
          <TaskItem key={task.id} {...task} />
        ))}
      </CardContent>
    </Card>
  );
}
