import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type MoodOption = "positive" | "neutral" | "negative";

const MOOD_OPTIONS: { value: MoodOption; emoji: string; label: string }[] = [
  { value: "positive", emoji: "😊", label: "Good" },
  { value: "neutral", emoji: "😐", label: "Okay" },
  { value: "negative", emoji: "😞", label: "Difficult" },
];

export default function MoodCheckIn() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    // Check if mood check-in has been shown today
    const lastCheckIn = localStorage.getItem("last_mood_checkin");
    const today = new Date().toDateString();
    
    if (lastCheckIn === today) return;

    // Show check-in after 2 minutes of session (give user time to interact)
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2 * 60 * 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    if (!selectedMood) return;

    const sessionId = localStorage.getItem("peacepad_session_id") || "unknown";
    const moodData = {
      sessionId,
      mood: selectedMood,
      note: note.trim(),
      timestamp: new Date().toISOString(),
    };

    // Store mood data locally (could be sent to server in future)
    const storedMoods = JSON.parse(localStorage.getItem("mood_history") || "[]");
    storedMoods.push(moodData);
    localStorage.setItem("mood_history", JSON.stringify(storedMoods));
    
    // Mark as completed for today
    localStorage.setItem("last_mood_checkin", new Date().toDateString());
    
    setIsOpen(false);
    resetForm();
  };

  const handleSkip = () => {
    localStorage.setItem("last_mood_checkin", new Date().toDateString());
    setIsOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedMood(null);
    setNote("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" data-testid="mood-checkin-dialog">
        <DialogHeader>
          <DialogTitle className="text-xl">How are you feeling?</DialogTitle>
          <DialogDescription>
            Take a moment to reflect on your experience today
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Mood Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Your mood right now</Label>
            <div className="grid grid-cols-3 gap-3">
              {MOOD_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedMood === option.value ? "default" : "outline"}
                  className="h-24 flex flex-col gap-2 text-center"
                  onClick={() => setSelectedMood(option.value)}
                  data-testid={`button-mood-${option.value}`}
                >
                  <span className="text-3xl">{option.emoji}</span>
                  <span className="text-sm">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <Label htmlFor="mood-note" className="text-sm font-medium">
              Anything you'd like to note? (Optional)
            </Label>
            <Textarea
              id="mood-note"
              placeholder="What made you feel this way..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none h-20"
              data-testid="textarea-mood-note"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
              data-testid="button-skip-checkin"
            >
              Skip
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!selectedMood}
              data-testid="button-submit-checkin"
            >
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
