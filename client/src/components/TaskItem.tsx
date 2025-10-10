import { Checkbox } from "@/components/ui/checkbox";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface TaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export default function TaskItem({ id, title, completed, dueDate }: TaskItemProps) {
  const { toast } = useToast();

  const updateTask = useMutation({
    mutationFn: async (newCompleted: boolean) => {
      return await apiRequest(`/api/tasks/${id}`, "PATCH", { completed: newCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
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
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    },
  });

  const handleToggle = (checked: boolean) => {
    updateTask.mutate(checked);
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
