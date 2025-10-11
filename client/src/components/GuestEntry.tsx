import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload, User } from "lucide-react";

interface GuestEntryProps {
  onAuthenticated: () => void;
}

const DEFAULT_EMOJIS = ["😊", "👨", "👩", "🐶", "🐱", "🌟", "💫", "🌈"];
const RANDOM_EMOJIS = ["🌞", "🌻", "🦋", "✨"];

function getRandomEmoji() {
  return RANDOM_EMOJIS[Math.floor(Math.random() * RANDOM_EMOJIS.length)];
}

export default function GuestEntry({ onAuthenticated }: GuestEntryProps) {
  const [displayName, setDisplayName] = useState("");
  const [profileImage, setProfileImage] = useState<string>(`emoji:${getRandomEmoji()}`);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user already has a session
    const checkExistingSession = async () => {
      const sessionId = localStorage.getItem("peacepad_session_id");
      if (sessionId) {
        try {
          const response = await fetch("/api/auth/user");
          if (response.ok) {
            const data = await response.json();
            toast({
              title: "Welcome back!",
              description: `Hello again, ${data.displayName || 'Guest'}!`,
            });
            onAuthenticated();
          } else if (response.status === 401) {
            // Session expired, clear it silently
            localStorage.removeItem("peacepad_session_id");
          }
        } catch (error) {
          console.error("Session check error:", error);
          // Don't show error to user, just clear the session
          localStorage.removeItem("peacepad_session_id");
        }
      }
    };

    checkExistingSession();
  }, [onAuthenticated, toast]);

  const handleEmojiSelect = (emoji: string) => {
    setProfileImage(`emoji:${emoji}`);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to 0.8 quality JPEG
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 2MB before compression)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB",
        variant: "destructive",
      });
      return;
    }

    try {
      const compressed = await compressImage(file);
      setProfileImage(compressed);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGuestEntry = async (asGuest: boolean) => {
    setIsLoading(true);
    try {
      const sessionId = localStorage.getItem("peacepad_session_id");
      const response = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: asGuest ? undefined : displayName || undefined,
          profileImageUrl: profileImage,
          sessionId: sessionId || undefined,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Authentication failed" }));
        throw new Error(errorData.message || "Authentication failed");
      }

      const data = await response.json();
      localStorage.setItem("peacepad_session_id", data.sessionId);

      toast({
        title: "Success!",
        description: data.message,
      });

      onAuthenticated();
    } catch (error: any) {
      console.error("Guest entry error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to authenticate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isEmoji = profileImage.startsWith("emoji:");
  const emojiValue = isEmoji ? profileImage.replace("emoji:", "") : "";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-center">
            Welcome to PeacePad
          </CardTitle>
          <CardDescription className="text-center">
            A co-parenting communication platform with AI-powered emotional intelligence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile Picture Selection */}
          <div className="space-y-3">
            <Label>Choose Your Profile Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16" data-testid="avatar-preview">
                {isEmoji ? (
                  <div className="flex items-center justify-center text-3xl" data-testid="avatar-emoji-display">{emojiValue}</div>
                ) : profileImage ? (
                  <AvatarImage src={profileImage} data-testid="avatar-image-display" />
                ) : (
                  <AvatarFallback data-testid="avatar-fallback">
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                )}
              </Avatar>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                data-testid="button-upload-profile"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Photo
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                data-testid="input-profile-upload"
              />
            </div>
            
            {/* Emoji Picker */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {DEFAULT_EMOJIS.map((emoji) => (
                <Button
                  key={emoji}
                  variant={emojiValue === emoji ? "default" : "outline"}
                  className="h-12 w-12 sm:h-10 sm:w-10 text-xl p-0"
                  onClick={() => handleEmojiSelect(emoji)}
                  disabled={isLoading}
                  data-testid={`button-emoji-${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>

          {/* Display Name Input */}
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name (Optional)</Label>
            <Input
              id="display-name"
              placeholder="Enter your name or stay anonymous"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
              data-testid="input-display-name"
            />
            <p className="text-sm text-muted-foreground">
              Leave blank to join as a guest
            </p>
          </div>

          {/* Entry Buttons */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => handleGuestEntry(false)}
              disabled={isLoading}
              data-testid="button-enter-with-name"
            >
              {isLoading ? "Entering..." : "Enter PeacePad"}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleGuestEntry(true)}
              disabled={isLoading}
              data-testid="button-enter-as-guest"
            >
              Continue as Guest
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>No email or password required</p>
            <p>Your session will last 14 days</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
