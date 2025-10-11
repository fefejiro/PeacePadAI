import { useState, useEffect } from "react";
import { Paperclip, ThumbsUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClippyProps {
  onHintClick?: () => void;
}

const HINTS = [
  "💬 Try the mic button to send voice messages!",
  "📸 You can upload photos to share with your co-parent",
  "🎯 Check out the tone analysis for helpful communication tips",
  "📅 Use the scheduling feature to coordinate custody times",
  "💡 Visit Settings to customize your experience",
  "🤝 Share your session link to invite your co-parent",
];

export default function Clippy({ onHintClick }: ClippyProps) {
  const [isEnabled, setIsEnabled] = useState(() => {
    const stored = localStorage.getItem("hints_enabled");
    return stored !== null ? stored === "true" : true;
  });
  const [currentHint, setCurrentHint] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [isDancing, setIsDancing] = useState(false);

  // Listen to hints toggle changes
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("hints_enabled");
      setIsEnabled(stored === "true");
      setShowHint(false);
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also check periodically for same-tab changes
    const interval = setInterval(() => {
      const stored = localStorage.getItem("hints_enabled");
      const newState = stored === "true";
      if (newState !== isEnabled) {
        setIsEnabled(newState);
        setShowHint(false);
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [isEnabled]);

  // Random dance animation every 20-40 seconds
  useEffect(() => {
    if (!isEnabled) return;

    const danceInterval = setInterval(() => {
      setIsDancing(true);
      setTimeout(() => setIsDancing(false), 2000);
    }, 20000 + Math.random() * 20000);

    return () => clearInterval(danceInterval);
  }, [isEnabled]);

  // Random hints every 30-60 seconds
  useEffect(() => {
    if (!isEnabled) return;

    const hintInterval = setInterval(() => {
      const randomHint = HINTS[Math.floor(Math.random() * HINTS.length)];
      setCurrentHint(randomHint);
      setShowHint(true);
      
      // Hide hint after 8 seconds
      setTimeout(() => setShowHint(false), 8000);
    }, 30000 + Math.random() * 30000);

    return () => clearInterval(hintInterval);
  }, [isEnabled]);

  const handleClick = () => {
    if (!isEnabled) {
      localStorage.setItem("hints_enabled", "true");
      setIsEnabled(true);
    } else {
      onHintClick?.();
    }
  };

  const handleDismissHint = () => {
    setShowHint(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Hint Bubble */}
      {showHint && currentHint && isEnabled && (
        <div
          className="
            max-w-xs bg-card border border-border rounded-lg p-3 shadow-lg
            animate-in fade-in slide-in-from-bottom-4 duration-300
          "
          data-testid="clippy-hint-bubble"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-foreground flex-1">{currentHint}</p>
            <button
              onClick={handleDismissHint}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Dismiss hint"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Clippy Character */}
      <Button
        variant={isEnabled ? "default" : "outline"}
        size="icon"
        className={`
          h-14 w-14 rounded-full shadow-lg
          ${isEnabled ? 'animate-bounce' : 'opacity-50'}
          ${isDancing ? 'animate-spin' : ''}
          transition-all duration-300
        `}
        onClick={handleClick}
        data-testid="clippy-button"
        aria-label={isEnabled ? "Clippy assistant" : "Enable hints"}
        title={isEnabled ? "Clippy is here to help!" : "Click to enable hints"}
      >
        {isEnabled ? (
          isDancing ? (
            <Sparkles className="h-6 w-6" />
          ) : (
            <Paperclip className="h-6 w-6" />
          )
        ) : (
          <Paperclip className="h-6 w-6 rotate-45" />
        )}
      </Button>

      {!isEnabled && (
        <div className="text-xs text-muted-foreground bg-card border border-border rounded px-2 py-1 shadow-sm">
          Click to enable hints
        </div>
      )}
    </div>
  );
}
