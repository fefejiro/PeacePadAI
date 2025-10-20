import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, Upload, User, Copy, Share2, Check, Phone, Sparkles, Moon, Sun, Monitor } from "lucide-react";
import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "@/components/ThemeProvider";


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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [sharePhoneWithContacts, setSharePhoneWithContacts] = useState(user?.sharePhoneWithContacts ?? false);
  const [inviteCodeCopied, setInviteCodeCopied] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const { theme, setTheme } = useTheme();

  const updateProfile = useMutation({
    mutationFn: async (data: { profileImageUrl?: string; displayName?: string; phoneNumber?: string; sharePhoneWithContacts?: boolean }) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated successfully", duration: 3000 });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/profile-upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      updateProfile.mutate({ profileImageUrl: data.url });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload profile photo",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const currentProfileImage = user?.profileImageUrl || "";

  // Generate shareable invite link based on user's invite code
  const inviteCode = user?.inviteCode || "";
  const inviteLink = inviteCode ? `${window.location.origin}/join/${inviteCode}` : "";
  const shareMessage = `I'm using PeacePad for co-parenting coordination. Join me: ${inviteLink}`;

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteLinkCopied(true);
      toast({ title: "Link copied!", description: "Share this link with your co-parent", duration: 3000 });
      setTimeout(() => setInviteLinkCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleShareInvite = async () => {
    const shareData = {
      title: "Join me on PeacePad",
      text: shareMessage,
      url: inviteLink,
    };

    try {
      // Check if Web Share API is supported (mobile devices, modern browsers)
      if (navigator.share) {
        await navigator.share(shareData);
        toast({ 
          title: "Shared!", 
          description: "Invite sent successfully", 
          duration: 3000 
        });
      } else {
        // Fallback to copying to clipboard on desktop
        await navigator.clipboard.writeText(shareMessage);
        toast({ 
          title: "Message copied!", 
          description: "Paste this message in SMS, WhatsApp, or email", 
          duration: 4000 
        });
      }
    } catch (error: any) {
      // User cancelled share or error occurred
      if (error.name !== 'AbortError') {
        toast({ 
          title: "Error sharing", 
          description: "Please try copying the link manually", 
          variant: "destructive", 
          duration: 5000 
        });
      }
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
      duration: 3000,
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
      duration: 3000,
    });
  };

  const handleDisplayNameSave = () => {
    // Validate display name is not empty
    if (!displayName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    updateProfile.mutate({ displayName: displayName.trim() });
  };

  const handlePhoneNumberSave = () => {
    // Basic validation for phone number format
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
        duration: 5000,
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
      duration: 3000,
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
        duration: 3000,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to regenerate invite code",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const copyInviteCodeOnly = async () => {
    if (!user?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(user.inviteCode);
      setInviteCodeCopied(true);
      toast({
        title: "Invite code copied!",
        description: "Share this code with your co-parent",
        duration: 3000,
      });
      setTimeout(() => setInviteCodeCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually",
        variant: "destructive",
        duration: 5000,
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
            <CardDescription>Upload a photo to personalize your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24 border-2 border-border">
                {currentProfileImage ? (
                  <AvatarImage src={currentProfileImage} alt="Profile" />
                ) : (
                  <AvatarFallback className="bg-muted">
                    <User className="h-12 w-12 text-muted-foreground" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 space-y-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={updateProfile.isPending}
                  data-testid="button-upload-image"
                  className="w-full sm:w-auto"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {currentProfileImage ? "Change Photo" : "Upload Photo"}
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  data-testid="input-profile-image"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: Square image, max 5MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Profile Information</h2>
            <CardDescription>Update your display name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <div className="flex gap-2">
                <Input
                  id="display-name"
                  type="text"
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  data-testid="input-display-name"
                />
                <Button
                  onClick={handleDisplayNameSave}
                  disabled={updateProfile.isPending || !displayName.trim()}
                  data-testid="button-save-name"
                >
                  {updateProfile.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                This name will be shown to your co-parent in messages
              </p>
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
            <CardDescription>Share this code with your co-parent to connect on PeacePad</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="px-6 py-4 bg-muted rounded-md border border-border text-center">
                <span className="text-3xl sm:text-4xl font-mono font-bold tracking-widest" data-testid="text-invite-code">
                  {user?.inviteCode || "Loading..."}
                </span>
              </div>
              
              <Button
                variant="default"
                size="default"
                onClick={handleShareInvite}
                disabled={!inviteLink}
                data-testid="button-share-invite"
                className="w-full min-h-12"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Invite
              </Button>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyInviteCodeOnly}
                  disabled={!user?.inviteCode}
                  data-testid="button-copy-invite-code"
                  className="flex-1"
                >
                  {inviteCodeCopied ? (
                    <>
                      <Check className="h-3 w-3 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-2" />
                      Copy Code
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => regenerateInviteCode.mutate()}
                  disabled={regenerateInviteCode.isPending}
                  data-testid="button-regenerate-invite-code"
                  className="flex-1"
                >
                  {regenerateInviteCode.isPending ? "Regenerating..." : "Regenerate"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                💡 Your co-parent needs this code to connect with you
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Appearance</h2>
            <CardDescription>Customize how PeacePad looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="default"
                  onClick={() => setTheme("light")}
                  data-testid="button-theme-light"
                  className="min-h-10"
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="default"
                  onClick={() => setTheme("dark")}
                  data-testid="button-theme-dark"
                  className="min-h-10"
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="default"
                  onClick={() => setTheme("system")}
                  data-testid="button-theme-system"
                  className="min-h-10"
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  System
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                System theme automatically matches your device settings
              </p>
            </div>
          </CardContent>
        </Card>

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
