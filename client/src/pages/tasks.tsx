import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";

export default function TasksPage() {
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <CheckSquare className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-semibold text-foreground">Shared Tasks</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Shared Tasks & To-Dos</h2>
          <CardDescription>Coming soon - Manage shared tasks, reminders, and to-do lists for your family</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This feature is currently under development. Soon you'll be able to create, assign, and track shared tasks for childcare, household responsibilities, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
