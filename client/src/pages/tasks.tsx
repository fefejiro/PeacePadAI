import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckSquare, Plus, Circle, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function TasksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const createTask = useMutation({
    mutationFn: async (data: {
      title: string;
      dueDate?: string;
      completed: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return await res.json();
    },
    onSuccess: async (newTask: Task) => {
      // Optimistically update the cache with the new task
      queryClient.setQueryData<Task[]>(["/api/tasks"], (oldTasks = []) => {
        return [...oldTasks, newTask];
      });
      setDialogOpen(false);
      setTitle("");
      setDueDate("");
      toast({ title: "Task created successfully", duration: 3000 });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, { completed });
      return await res.json();
    },
    onSuccess: async (updatedTask: Task) => {
      // Optimistically update the task in cache
      queryClient.setQueryData<Task[]>(["/api/tasks"], (oldTasks = []) => {
        return oldTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        );
      });
    },
  });

  const handleCreateTask = () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a task title",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    createTask.mutate({
      title,
      dueDate: dueDate || undefined,
      completed: false,
    });
  };

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Shared Tasks</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-task">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="task-title">Task Title</Label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Pick up kids from school"
                  data-testid="input-task-title"
                />
              </div>
              <div>
                <Label htmlFor="due-date">Due Date (Optional)</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  data-testid="input-due-date"
                />
              </div>
              <Button
                onClick={handleCreateTask}
                disabled={createTask.isPending}
                className="w-full"
                data-testid="button-save-task"
              >
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            To Do ({incompleteTasks.length})
          </h2>
          {incompleteTasks.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No pending tasks. Great job!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {incompleteTasks.map((task) => (
                <Card
                  key={task.id}
                  className="hover-elevate active-elevate-2"
                  data-testid={`task-card-${task.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTask.mutate({ id: task.id, completed: true })}
                        className="mt-0.5 hover-elevate active-elevate-2 rounded-full"
                        data-testid={`button-complete-task-${task.id}`}
                      >
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      </button>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{task.title}</h3>
                        {task.dueDate && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {completedTasks.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Completed ({completedTasks.length})
            </h2>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <Card
                  key={task.id}
                  className="opacity-60 hover:opacity-100 transition-opacity hover-elevate"
                  data-testid={`task-card-${task.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTask.mutate({ id: task.id, completed: false })}
                        className="mt-0.5 hover-elevate active-elevate-2 rounded-full"
                        data-testid={`button-uncomplete-task-${task.id}`}
                      >
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </button>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground line-through">{task.title}</h3>
                        {task.dueDate && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
