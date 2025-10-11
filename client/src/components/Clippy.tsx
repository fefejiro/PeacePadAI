import { useState, useEffect } from "react";
import { Paperclip, Sparkles, X } from "lucide-react";
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
  const [isBlinking, setIsBlinking] = useState(false);

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

  // Random blink animation every 3-5 seconds
  useEffect(() => {
    if (!isEnabled) return;

    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
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
    <div className="fixed bottom-6 left-6 z-50 flex items-end gap-3">
      {/* Clippy Character - Classic Windows Style */}
      <div className="relative">
        <Button
          variant={isEnabled ? "default" : "outline"}
          size="icon"
          className={`
            h-16 w-16 rounded-full shadow-2xl relative overflow-visible
            ${isEnabled ? 'clippy-bounce' : 'opacity-50'}
            ${isDancing ? 'clippy-dance' : ''}
            ${isBlinking ? 'clippy-blink' : ''}
            transition-all duration-300
          `}
          onClick={handleClick}
          data-testid="clippy-button"
          aria-label={isEnabled ? "Clippy assistant" : "Enable hints"}
          title={isEnabled ? "Hi! I'm Clippy, your PeacePad assistant!" : "Click to enable hints"}
        >
          {isEnabled ? (
            isDancing ? (
              <Sparkles className="h-7 w-7" />
            ) : (
              <Paperclip className="h-7 w-7" />
            )
          ) : (
            <Paperclip className="h-7 w-7 rotate-45 opacity-50" />
          )}
          
          {/* Eyes - Classic Clippy style */}
          {isEnabled && !isDancing && (
            <>
              <div 
                className={`absolute top-4 left-4 w-2 h-2 bg-background rounded-full clippy-eye ${isBlinking ? 'opacity-0' : 'opacity-100'} transition-opacity duration-100`}
              />
              <div 
                className={`absolute top-4 right-4 w-2 h-2 bg-background rounded-full clippy-eye ${isBlinking ? 'opacity-0' : 'opacity-100'} transition-opacity duration-100`}
              />
            </>
          )}
        </Button>

        {!isEnabled && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground bg-card border border-border rounded px-2 py-1 shadow-sm">
            Click to enable hints
          </div>
        )}
      </div>

      {/* Hint Bubble - Appears to the RIGHT of Clippy (classic Windows style) */}
      {showHint && currentHint && isEnabled && (
        <div
          className="
            max-w-sm bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-400 dark:border-yellow-600
            rounded-xl p-4 shadow-2xl relative
            animate-in fade-in slide-in-from-left-4 duration-300
            clippy-hint-bubble
          "
          data-testid="clippy-hint-bubble"
        >
          {/* Classic Windows-style pointer/arrow */}
          <div className="absolute -left-3 top-6 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-yellow-400 dark:border-r-yellow-600" />
          <div className="absolute -left-2 top-6 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-yellow-50 dark:border-r-yellow-950/30" />
          
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 leading-relaxed">
                {currentHint}
              </p>
            </div>
            <button
              onClick={handleDismissHint}
              className="text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-200 shrink-0 -mt-1 -mr-1"
              aria-label="Dismiss hint"
              data-testid="button-dismiss-hint"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {/* Classic Windows hint footer */}
          <div className="mt-2 pt-2 border-t border-yellow-300 dark:border-yellow-700">
            <p className="text-xs text-yellow-700 dark:text-yellow-500 italic">
              💡 Tip from Clippy
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
