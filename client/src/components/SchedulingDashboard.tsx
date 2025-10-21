import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, AlertTriangle, Plus, Download, CalendarDays, Sparkles, ChevronDown, Palette } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event, ScheduleTemplate, Partnership } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { CustodyScheduleBuilder, type CustodyConfig } from "./CustodyScheduleBuilder";
import { CustodyCalendarView } from "./CustodyCalendarView";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LocationData {
  displayName: string;
  address: string;
  lat: number;
  lng: number;
}

interface ConflictAnalysis {
  hasConflicts: boolean;
  conflicts: string[];
  suggestions: string[];
}

export default function SchedulingDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [custodyScheduleOpen, setCustodyScheduleOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("pickup");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<LocationData | null>(null);
  const [childName, setChildName] = useState("");
  const [recurring, setRecurring] = useState("none");
  const [notes, setNotes] = useState("");
  
  // Template selector state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateStartDate, setTemplateStartDate] = useState("");
  const [templateLocation, setTemplateLocation] = useState<LocationData | null>(null);
  const [templateChildName, setTemplateChildName] = useState("");

  // Form refs for Enter key navigation
  const titleRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLButtonElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const childNameRef = useRef<HTMLInputElement>(null);
  const recurringRef = useRef<HTMLButtonElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Helper function for Enter key navigation
  const handleEnterKey = (e: React.KeyboardEvent, nextRef: React.RefObject<any>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      nextRef.current?.focus();
      // For select triggers, click to open
      if (nextRef.current?.getAttribute('role') === 'combobox') {
        nextRef.current?.click();
      }
    }
  };

  // For textareas: Enter for new line, Shift+Enter to navigate
  const handleTextareaEnter = (e: React.KeyboardEvent, nextRef: React.RefObject<any>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
  
  const { data: templates = [], isLoading: templatesLoading } = useQuery<ScheduleTemplate[]>({
    queryKey: ["/api/schedule-templates"],
  });

  const { data: conflictAnalysis } = useQuery<ConflictAnalysis>({
    queryKey: ["/api/events/analyze"],
    enabled: events.length > 0,
  });

  const { data: partnerships = [] } = useQuery<Partnership[]>({
    queryKey: ["/api/partnerships"],
    enabled: !!user,
  });

  const createEvent = useMutation({
    mutationFn: async (data: {
      title: string;
      type: string;
      startDate: string;
      endDate?: string;
      description?: string;
      location?: LocationData;
      childName?: string;
      recurring?: string;
      notes?: string;
    }) => {
      const res = await apiRequest("POST", "/api/events", data);
      return await res.json();
    },
    onSuccess: (newEvent: Event) => {
      // Optimistically update the cache with the new event
      queryClient.setQueryData(["/api/events"], (old: Event[] = []) => {
        return [...old, newEvent].sort((a, b) => 
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
      });
      
      // Invalidate analyze query to trigger conflict detection
      queryClient.invalidateQueries({ queryKey: ["/api/events/analyze"] });
      
      // Update UI immediately
      setDialogOpen(false);
      setTitle("");
      setType("pickup");
      setStartDate("");
      setEndDate("");
      setDescription("");
      setLocation(null);
      setChildName("");
      setRecurring("none");
      setNotes("");
      toast({ title: "Event created successfully", duration: 3000 });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handleCreateEvent = () => {
    if (!title.trim() || !startDate) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    createEvent.mutate({
      title,
      type,
      startDate,
      endDate: endDate || undefined,
      description: description || undefined,
      location: location || undefined,
      childName: childName || undefined,
      recurring: recurring !== "none" ? recurring : undefined,
      notes: notes || undefined,
    });
  };
  
  const applyTemplate = useMutation({
    mutationFn: async (data: {
      templateId: string;
      startDate: string;
      childName?: string;
      location?: LocationData;
    }) => {
      const res = await apiRequest("POST", `/api/schedule-templates/${data.templateId}/apply`, {
        startDate: data.startDate,
        childName: data.childName,
        location: data.location,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/analyze"] });
      setTemplateDialogOpen(false);
      setSelectedTemplateId("");
      setTemplateStartDate("");
      setTemplateLocation(null);
      setTemplateChildName("");
      toast({ 
        title: "Template applied successfully",
        description: `Created ${data.events?.length || 0} events from template`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply template",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handleApplyTemplate = () => {
    if (!selectedTemplateId || !templateStartDate) {
      toast({
        title: "Error",
        description: "Please select a template and start date",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    applyTemplate.mutate({
      templateId: selectedTemplateId,
      startDate: templateStartDate,
      childName: templateChildName || undefined,
      location: templateLocation || undefined,
    });
  };

  const handleSaveCustodySchedule = async (config: CustodyConfig) => {
    if (partnerships.length === 0) {
      toast({
        title: "Error",
        description: "No partnership found",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    const partnershipId = partnerships[0].id;
    try {
      const res = await apiRequest("PATCH", `/api/partnerships/${partnershipId}/custody`, config);
      await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/partnerships"] });
      toast({ 
        title: "Custody schedule saved",
        description: "Your calendar will now show color-coded custody days",
        duration: 4000,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save custody schedule",
        variant: "destructive",
        duration: 5000,
      });
      throw error;
    }
  };
  
  const handleDownloadICal = () => {
    window.location.href = '/api/events/export/ical';
    toast({ title: "Downloading calendar...", duration: 4000 });
  };
  
  const handleAddToGoogleCalendar = () => {
    // Generate a Google Calendar import URL
    const icalUrl = `${window.location.origin}/api/events/export/ical`;
    const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icalUrl)}`;
    window.open(googleCalUrl, '_blank');
    toast({ title: "Opening Google Calendar...", duration: 4000 });
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "pickup":
        return "bg-primary/10 border-primary/30 dark:bg-primary/20 dark:border-primary/40";
      case "dropoff":
        return "bg-accent/30 border-accent/50 dark:bg-accent/40 dark:border-accent/60";
      case "school":
        return "bg-chart-5/10 border-chart-5/30 dark:bg-chart-5/20 dark:border-chart-5/40";
      case "medical":
        return "bg-destructive/10 border-destructive/30 dark:bg-destructive/20 dark:border-destructive/40";
      case "activity":
        return "bg-chart-3/10 border-chart-3/30 dark:bg-chart-3/20 dark:border-chart-3/40";
      case "vacation":
        return "bg-chart-4/10 border-chart-4/30 dark:bg-chart-4/20 dark:border-chart-4/40";
      case "holiday":
        return "bg-chart-1/10 border-chart-1/30 dark:bg-chart-1/20 dark:border-chart-1/40";
      default:
        return "bg-muted/50 border-muted dark:bg-muted/70 dark:border-muted";
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-2xl">
            <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Schedule</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Organize your family time</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full sm:w-auto shadow-sm" data-testid="button-add-event-menu">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                onClick={() => setDialogOpen(true)}
                data-testid="menu-item-add-event"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Event
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setTemplateDialogOpen(true)}
                data-testid="menu-item-use-template"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Use Template
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  if (partnerships.length === 0) {
                    toast({
                      title: "Connect with co-parent first",
                      description: "Share your invite code with your co-parent to start using the custody calendar together",
                      duration: 5000,
                    });
                  } else {
                    setCustodyScheduleOpen(true);
                  }
                }}
                data-testid="menu-item-custody-schedule"
              >
                <Palette className="h-4 w-4 mr-2" />
                Set Up Custody Schedule
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDownloadICal}
                data-testid="menu-item-download-ical"
              >
                <Download className="h-4 w-4 mr-2" />
                Download iCal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Apply Custody Schedule Template</DialogTitle>
                <DialogDescription>
                  Choose a pre-built custody schedule to quickly populate your calendar
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="template-select">Select Template</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger data-testid="select-template">
                      <SelectValue placeholder="Choose a custody schedule template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id!}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplateId && templates.find(t => t.id === selectedTemplateId) && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {templates.find(t => t.id === selectedTemplateId)?.description}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="template-start-date">Start Date</Label>
                  <Input
                    id="template-start-date"
                    type="date"
                    value={templateStartDate}
                    onChange={(e) => setTemplateStartDate(e.target.value)}
                    data-testid="input-template-start-date"
                  />
                </div>
                <div>
                  <Label htmlFor="template-child-name">Child Name (Optional)</Label>
                  <Input
                    id="template-child-name"
                    value={templateChildName}
                    onChange={(e) => setTemplateChildName(e.target.value)}
                    placeholder="e.g., Emma"
                    data-testid="input-template-child-name"
                  />
                </div>
                <div>
                  <Label>Location (Optional)</Label>
                  <LocationAutocomplete
                    value={templateLocation}
                    onChange={setTemplateLocation}
                    placeholder="e.g., 123 Main St, Target on 5th Ave"
                    disabled={applyTemplate.isPending}
                  />
                </div>
                <Button 
                  onClick={handleApplyTemplate}
                  disabled={applyTemplate.isPending}
                  className="w-full"
                  data-testid="button-apply-template"
                >
                  {applyTemplate.isPending ? "Applying..." : "Apply Template"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 overflow-y-auto flex-1 pr-2">
              <div>
                <Label htmlFor="event-title">Title</Label>
                <Input
                  ref={titleRef}
                  id="event-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => handleEnterKey(e, typeRef)}
                  placeholder="Event title"
                  data-testid="input-event-title"
                />
              </div>
              <div>
                <Label htmlFor="event-type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger ref={typeRef} data-testid="select-event-type">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="dropoff">Drop-off</SelectItem>
                    <SelectItem value="school">School Event</SelectItem>
                    <SelectItem value="medical">Medical Appointment</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="vacation">Vacation with Child</SelectItem>
                    <SelectItem value="holiday">Holiday with Child</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start-date">Start Date & Time</Label>
                <Input
                  ref={startDateRef}
                  id="start-date"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onKeyDown={(e) => handleEnterKey(e, endDateRef)}
                  data-testid="input-start-date"
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date & Time (Optional)</Label>
                <Input
                  ref={endDateRef}
                  id="end-date"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onKeyDown={(e) => handleEnterKey(e, descriptionRef)}
                  data-testid="input-end-date"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  ref={descriptionRef}
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => handleTextareaEnter(e, childNameRef)}
                  placeholder="Add any notes or details"
                  data-testid="input-event-description"
                />
              </div>
              <div>
                <Label>Location (Optional)</Label>
                <LocationAutocomplete
                  value={location}
                  onChange={setLocation}
                  placeholder="e.g., School, Target on Main St, 123 Oak Ave"
                  disabled={createEvent.isPending}
                />
              </div>
              <div>
                <Label htmlFor="child-name">Child Name (Optional)</Label>
                <Input
                  ref={childNameRef}
                  id="child-name"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  onKeyDown={(e) => handleEnterKey(e, recurringRef)}
                  placeholder="Which child this relates to"
                  data-testid="input-child-name"
                />
              </div>
              <div>
                <Label htmlFor="recurring">Recurring (Optional)</Label>
                <Select value={recurring} onValueChange={setRecurring}>
                  <SelectTrigger ref={recurringRef} data-testid="select-recurring">
                    <SelectValue placeholder="Select recurring pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (One-time event)</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  ref={notesRef}
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.shiftKey) {
                      e.preventDefault();
                      handleCreateEvent();
                    }
                  }}
                  placeholder="Any additional notes or reminders"
                  data-testid="input-event-notes"
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
      </div>

      {/* Custody Calendar View */}
      {partnerships.length > 0 && user && (
        <CustodyCalendarView
          partnership={partnerships[0]}
          events={events}
          currentUserId={user.id}
        />
      )}

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

      <div className="space-y-4 animate-slide-up" style={{animationDelay: "100ms"}}>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">Upcoming Events</h2>
        {events.length === 0 ? (
          <Card className="rounded-2xl shadow-sm animate-scale-in">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="max-w-sm mx-auto space-y-3">
                <div className="inline-flex p-3 bg-primary/10 rounded-full mb-2">
                  <CalendarDays className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground">No events scheduled yet. Add your first event to get started!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => (
              <Card
                key={event.id}
                className={`${getEventColor(event.type)} hover-elevate rounded-2xl shadow-sm border-2 animate-slide-up`}
                style={{animationDelay: `${index * 50}ms`}}
                data-testid={`event-card-${event.id}`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-base sm:text-lg">{event.title}</h3>
                        <Badge variant="outline" className="capitalize rounded-full text-xs">
                          {event.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span className="text-xs sm:text-sm">
                          {new Date(event.startDate).toLocaleString([], { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                          {event.endDate &&
                            ` - ${new Date(event.endDate).toLocaleString([], { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}`}
                        </span>
                      </div>
                      {event.childName && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Child:</span> {event.childName}
                        </p>
                      )}
                      {event.location && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Location:</span> {event.location}
                        </p>
                      )}
                      {event.recurring && event.recurring !== "none" && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Recurring:</span> {event.recurring}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{event.description}</p>
                      )}
                      {event.notes && (
                        <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed">{event.notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Custody Schedule Builder */}
      {partnerships.length > 0 && user && (
        <CustodyScheduleBuilder
          open={custodyScheduleOpen}
          onClose={() => setCustodyScheduleOpen(false)}
          partnership={partnerships[0]}
          currentUserId={user.id}
          onSave={handleSaveCustodySchedule}
        />
      )}
    </div>
  );
}
