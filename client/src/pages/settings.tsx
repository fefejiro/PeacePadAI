import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, Upload, User, Copy, Share2, Check, Phone, Sparkles } from "lucide-react";
import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "wouter";

const EMOJI_OPTIONS = [
  "😊", "😎", "🤗", "😇", "🥰", "😃", "🙂", "😌",
  "👨", "👩", "👦", "👧", "🧑", "👶", "👴", "👵",
  "🐶", "🐱", "🐻", "🦁", "🐼", "🦊", "🐯", "🐨",
  "🌟", "💫", "⭐", "✨", "🌈", "🎨", "🎭", "🎪"
];

export default function SettingsPage() {
  const [toneAnalysis, setToneAnalysis] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [hintsEnabled, setHintsEnabled] = useState(() => {
    const stored = localStorage.getItem("hints_enabled");
    return stored !== null ? stored === "true" : true; // Default ON
  });
  const [clippyEnabled, setClippyEnabled] = useState(() => {
    const stored = localStorage.getItem("clippy_enabled");
    return stored !== null ? stored === "true" : false; // Default OFF
  });
  const [affirmationsEnabled, setAffirmationsEnabled] = useState(() => {
    const stored = localStorage.getItem("affirmations_enabled");
    return stored !== null ? stored === "true" : false; // Default OFF
  });
  const [moodCheckInsEnabled, setMoodCheckInsEnabled] = useState(() => {
    const stored = localStorage.getItem("mood_checkins_enabled");
    return stored !== null ? stored === "true" : false; // Default OFF
  });
  const [aiListeningEnabled, setAiListeningEnabled] = useState(() => {
    const stored = localStorage.getItem("ai_listening_enabled");
    return stored !== null ? stored === "true" : false; // Default OFF
  });
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [sharePhoneWithContacts, setSharePhoneWithContacts] = useState(user?.sharePhoneWithContacts ?? false);
  const [inviteCodeCopied, setInviteCodeCopied] = useState(false);

  const updateProfile = useMutation({
    mutationFn: async (data: { profileImageUrl?: string; displayName?: string; phoneNumber?: string; sharePhoneWithContacts?: boolean }) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    updateProfile.mutate({ profileImageUrl: `emoji:${emoji}` });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      updateProfile.mutate({ profileImageUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const currentProfileImage = user?.profileImageUrl || "";
  const isEmoji = currentProfileImage.startsWith("emoji:");
  const emojiValue = isEmoji ? currentProfileImage.replace("emoji:", "") : "";

  // Generate shareable session link - only show if session ID exists
  const sessionId = localStorage.getItem("peacepad_session_id") || "";
  const hasValidSession = sessionId && sessionId.length > 0;
  const shareableLink = hasValidSession ? `${window.location.origin}?session=${sessionId}` : "";

  const copySessionLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      toast({ title: "Link copied!", description: "Share this link with your co-parent" });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const shareViaSystem = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join PeacePad",
          text: "Join me on PeacePad for co-parenting communication",
          url: shareableLink,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast({
            title: "Share failed",
            description: "Please copy the link instead",
            variant: "destructive",
          });
        }
      }
    } else {
      copySessionLink();
    }
  };

  const handleHintsToggle = (enabled: boolean) => {
    setHintsEnabled(enabled);
    localStorage.setItem("hints_enabled", String(enabled));
    toast({
      title: enabled ? "Hints enabled" : "Hints disabled",
      description: enabled 
        ? "You'll see helpful tips throughout the app" 
        : "Tips are now hidden",
    });
  };

  const handleClippyToggle = (enabled: boolean) => {
    setClippyEnabled(enabled);
    localStorage.setItem("clippy_enabled", String(enabled));
    window.location.reload(); // Reload to apply changes
  };

  const handleAffirmationsToggle = (enabled: boolean) => {
    setAffirmationsEnabled(enabled);
    localStorage.setItem("affirmations_enabled", String(enabled));
    window.location.reload(); // Reload to apply changes
  };

  const handleMoodCheckInsToggle = (enabled: boolean) => {
    setMoodCheckInsEnabled(enabled);
    localStorage.setItem("mood_checkins_enabled", String(enabled));
    window.location.reload(); // Reload to apply changes
  };

  const handleAiListeningToggle = (enabled: boolean) => {
    setAiListeningEnabled(enabled);
    localStorage.setItem("ai_listening_enabled", String(enabled));
    toast({
      title: enabled ? "AI Listening enabled" : "AI Listening disabled",
      description: enabled
        ? "AI will analyze emotional tone during calls when both participants have it enabled"
        : "AI listening is now disabled",
    });
  };

  const handlePhoneNumberSave = () => {
    // Basic validation for phone number format
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }
    
    updateProfile.mutate({ phoneNumber });
  };

  const handleViewWelcomeTour = () => {
    localStorage.removeItem("hasSeenIntro");
    toast({
      title: "Welcome tour restarted",
      description: "You'll see the introduction slideshow again",
    });
    setLocation("/");
  };

  const regenerateInviteCode = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/partnerships/regenerate-code", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Invite code regenerated",
        description: "Your new invite code is ready to share",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to regenerate invite code",
        variant: "destructive",
      });
    },
  });

  const copyInviteCode = async () => {
    if (!user?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(user.inviteCode);
      setInviteCodeCopied(true);
      toast({
        title: "Invite code copied!",
        description: "Share this code with your co-parent",
      });
      setTimeout(() => setInviteCodeCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Profile Picture</h2>
            <CardDescription>Choose an emoji or upload your own picture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {isEmoji ? (
                  <div className="flex items-center justify-center text-4xl">{emojiValue}</div>
                ) : currentProfileImage ? (
                  <AvatarImage src={currentProfileImage} />
                ) : (
                  <AvatarFallback>
                    <User className="h-10 w-10" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">Current profile picture</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-image"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  data-testid="input-profile-image"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Or choose an emoji</Label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <Button
                    key={emoji}
                    variant={selectedEmoji === emoji || emojiValue === emoji ? "default" : "outline"}
                    className="h-12 w-12 text-2xl p-0"
                    onClick={() => handleEmojiSelect(emoji)}
                    data-testid={`button-emoji-${emoji}`}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Contact Information</h2>
            <CardDescription>Add your phone number for contact sharing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-number">Phone Number</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone-number"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-9"
                    data-testid="input-phone-number"
                  />
                </div>
                <Button
                  onClick={handlePhoneNumberSave}
                  disabled={updateProfile.isPending}
                  data-testid="button-save-phone"
                >
                  {updateProfile.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Your phone number will be visible to your contacts for easy communication
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="share-phone">Share Phone Number with Mutual Contacts</Label>
                <p className="text-sm text-muted-foreground">
                  Only contacts who have also added you will see your phone number
                </p>
              </div>
              <Switch
                id="share-phone"
                checked={sharePhoneWithContacts}
                onCheckedChange={(checked) => {
                  setSharePhoneWithContacts(checked);
                  updateProfile.mutate({ sharePhoneWithContacts: checked });
                }}
                data-testid="switch-share-phone"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">AI Features</h2>
            <CardDescription>Manage AI-powered communication tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tone-analysis">Tone Analysis</Label>
                <p className="text-sm text-muted-foreground">
                  Analyze emotional tone of messages
                </p>
              </div>
              <Switch
                id="tone-analysis"
                checked={toneAnalysis}
                onCheckedChange={setToneAnalysis}
                data-testid="switch-tone-analysis"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="hints-enabled">Hints & Tips</Label>
                <p className="text-sm text-muted-foreground">
                  Show helpful contextual guidance
                </p>
              </div>
              <Switch
                id="hints-enabled"
                checked={hintsEnabled}
                onCheckedChange={handleHintsToggle}
                data-testid="switch-hints-enabled"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Wellness Features (Optional)</h2>
            <CardDescription>Additional emotional support tools - all disabled by default for a focused experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="clippy-enabled">Clippy Assistant</Label>
                <p className="text-sm text-muted-foreground">
                  Animated paperclip mascot with helpful hints
                </p>
              </div>
              <Switch
                id="clippy-enabled"
                checked={clippyEnabled}
                onCheckedChange={handleClippyToggle}
                data-testid="switch-clippy-enabled"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="affirmations-enabled">Daily Affirmations</Label>
                <p className="text-sm text-muted-foreground">
                  Positive messages for peaceful co-parenting
                </p>
              </div>
              <Switch
                id="affirmations-enabled"
                checked={affirmationsEnabled}
                onCheckedChange={handleAffirmationsToggle}
                data-testid="switch-affirmations-enabled"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="mood-checkins-enabled">Mood Check-ins</Label>
                <p className="text-sm text-muted-foreground">
                  Emotional reflection prompts during quiet moments
                </p>
              </div>
              <Switch
                id="mood-checkins-enabled"
                checked={moodCheckInsEnabled}
                onCheckedChange={handleMoodCheckInsToggle}
                data-testid="switch-mood-checkins-enabled"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-listening-enabled">AI Listening (Calls)</Label>
                <p className="text-sm text-muted-foreground">
                  Continuous emotional tone analysis during video/audio calls
                </p>
              </div>
              <Switch
                id="ai-listening-enabled"
                checked={aiListeningEnabled}
                onCheckedChange={handleAiListeningToggle}
                data-testid="switch-ai-listening-enabled"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Notifications</h2>
            <CardDescription>Manage how you receive updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts for new messages
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
                data-testid="switch-notifications"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Your Invite Code</h2>
            <CardDescription>Share this code with your co-parent to connect</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Invite Code</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Your co-parent needs this 6-character code to add you as a partner
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 px-4 py-3 bg-muted rounded-md border border-border text-center">
                  <span className="text-2xl font-mono font-bold tracking-widest" data-testid="text-invite-code">
                    {user?.inviteCode || "Loading..."}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={copyInviteCode}
                    disabled={!user?.inviteCode}
                    data-testid="button-copy-invite-code"
                    className="flex-1 sm:flex-none min-h-10"
                  >
                    {inviteCodeCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => regenerateInviteCode.mutate()}
                    disabled={regenerateInviteCode.isPending}
                    data-testid="button-regenerate-invite-code"
                    className="flex-1 sm:flex-none min-h-10"
                  >
                    {regenerateInviteCode.isPending ? "Regenerating..." : "Regenerate"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Regenerate your code if you want to revoke access or shared it by mistake
              </p>
            </div>
          </CardContent>
        </Card>

{hasValidSession && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Share Your Session</h2>
              <CardDescription>Invite your co-parent to join this conversation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Your Session Link</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Share this link with your co-parent to join the same conversation
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 px-3 py-2 bg-muted rounded-md border border-border text-sm font-mono break-all" data-testid="text-session-link">
                    {shareableLink}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={copySessionLink}
                      data-testid="button-copy-session-link"
                      className="flex-1 sm:flex-none min-h-10"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      variant="default"
                      size="default"
                      onClick={shareViaSystem}
                      data-testid="button-share-session-link"
                      className="flex-1 sm:flex-none min-h-10"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Getting Started</h2>
            <CardDescription>Review the welcome tour and introduction</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={handleViewWelcomeTour}
              data-testid="button-view-welcome-tour"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              View Welcome Tour
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Account</h2>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" data-testid="button-change-password">
              Change Password
            </Button>
            <Button variant="destructive" data-testid="button-delete-account">
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
