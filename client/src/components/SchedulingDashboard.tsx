import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, AlertTriangle, Plus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConflictAnalysis {
  hasConflicts: boolean;
  conflicts: string[];
  suggestions: string[];
}

export default function SchedulingDashboard() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("pickup");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: conflictAnalysis } = useQuery<ConflictAnalysis>({
    queryKey: ["/api/events/analyze"],
    enabled: events.length > 0,
  });

  const createEvent = useMutation({
    mutationFn: async (data: {
      title: string;
      type: string;
      startDate: string;
      endDate?: string;
      description?: string;
    }) => {
      const res = await apiRequest("POST", "/api/events", data);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch queries in the background
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.refetchQueries({ queryKey: ["/api/events"] }).catch(err => {
        console.error("Failed to refetch events:", err);
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events/analyze"] });
      
      // Update UI immediately
      setDialogOpen(false);
      setTitle("");
      setType("pickup");
      setStartDate("");
      setEndDate("");
      setDescription("");
      toast({ title: "Event created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const handleCreateEvent = () => {
    if (!title.trim() || !startDate) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }
    createEvent.mutate({
      title,
      type,
      startDate,
      endDate: endDate || undefined,
      description: description || undefined,
    });
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "pickup":
        return "bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-700";
      case "dropoff":
        return "bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-700";
      case "school":
        return "bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-700";
      case "medical":
        return "bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-700";
      case "activity":
        return "bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700";
      default:
        return "bg-gray-100 dark:bg-gray-950 border-gray-300 dark:border-gray-700";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-muted-foreground">Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Scheduling Dashboard</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-event">
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="event-title">Title</Label>
                <Input
                  id="event-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                  data-testid="input-event-title"
                />
              </div>
              <div>
                <Label htmlFor="event-type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-event-type">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="dropoff">Drop-off</SelectItem>
                    <SelectItem value="school">School Event</SelectItem>
                    <SelectItem value="medical">Medical Appointment</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start-date">Start Date & Time</Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date & Time (Optional)</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any notes or details"
                  data-testid="input-event-description"
                />
              </div>
              <Button
                onClick={handleCreateEvent}
                disabled={createEvent.isPending}
                data-testid="button-save-event"
              >
                {createEvent.isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {conflictAnalysis?.hasConflicts && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-5 w-5" />
              Schedule Conflicts Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              {conflictAnalysis.conflicts.map((conflict, index) => (
                <p key={index} className="text-sm text-amber-800 dark:text-amber-200">
                  • {conflict}
                </p>
              ))}
            </div>
            {conflictAnalysis.suggestions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-300 dark:border-amber-700">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                  Suggestions:
                </p>
                {conflictAnalysis.suggestions.map((suggestion, index) => (
                  <p key={index} className="text-sm text-amber-800 dark:text-amber-200">
                    • {suggestion}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        <h2 className="text-xl font-semibold text-foreground">Upcoming Events</h2>
        {events.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No events scheduled. Add one to get started!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Card
                key={event.id}
                className={`${getEventColor(event.type)} hover-elevate`}
                data-testid={`event-card-${event.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{event.title}</h3>
                        <Badge variant="outline" className="capitalize">
                          {event.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(event.startDate).toLocaleString()}
                          {event.endDate &&
                            ` - ${new Date(event.endDate).toLocaleString()}`}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
