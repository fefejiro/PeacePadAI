import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, ChevronRight, Upload, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LandingIntroSlideshow from "@/components/LandingIntroSlideshow";
import ConsentAgreement from "@/components/ConsentAgreement";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [showIntro, setShowIntro] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [childName, setChildName] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [inviteCodeCopied, setInviteCodeCopied] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const inviteCode = user?.inviteCode || "";
  const inviteLink = `${window.location.origin}/join/${inviteCode}`;

  // Check if user is joining via invite link and should see intro/consent
  useEffect(() => {
    const pendingCode = localStorage.getItem("pending_join_code");
    const hasSeenIntro = localStorage.getItem("hasSeenIntro");
    const hasAcceptedConsent = localStorage.getItem("hasAcceptedConsent");
    
    console.log("[Onboarding] Checking status - Pending code:", pendingCode, "Has seen intro:", hasSeenIntro, "Has accepted consent:", hasAcceptedConsent);
    
    // Show intro for users joining via invite link who haven't seen it
    if (pendingCode && !hasSeenIntro) {
      console.log("[Onboarding] Showing intro slideshow for invite link user");
      setShowIntro(true);
    } else if (pendingCode && !hasAcceptedConsent) {
      console.log("[Onboarding] Showing consent for invite link user");
      setShowConsent(true);
    }
  }, []);

  const handleIntroComplete = () => {
    console.log("[Onboarding] Intro slideshow completed");
    localStorage.setItem("hasSeenIntro", "true");
    setShowIntro(false);
    setShowConsent(true);
  };

  const handleConsentAccept = () => {
    console.log("[Onboarding] Consent accepted");
    localStorage.setItem("hasAcceptedConsent", "true");
    setShowConsent(false);
  };

  const createGuestAccount = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName: displayName || `Guest${Math.random().toString(36).substring(7)}` }),
      });
      if (!res.ok) throw new Error("Failed to create account");
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Upload profile image if provided
      if (profileImage) {
        uploadProfileImage.mutate();
      } else {
        setStep(2);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const uploadProfileImage = useMutation({
    mutationFn: async () => {
      if (!profileImage) return;
      const formData = new FormData();
      formData.append("file", profileImage);
      const res = await fetch("/api/profile-upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload image");
      const data = await res.json();
      
      // Update user profile with image URL
      await apiRequest("PATCH", "/api/user/profile", {
        profileImageUrl: data.profileImageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setStep(2);
    },
    onError: () => {
      toast({
        title: "Warning",
        description: "Profile image upload failed, but your account was created.",
        duration: 4000,
      });
      setStep(2);
    },
  });

  const updateOptionalDetails = useMutation({
    mutationFn: async () => {
      const updates: any = {};
      if (childName) updates.childName = childName;
      if (relationshipType) updates.relationshipType = relationshipType;
      
      if (Object.keys(updates).length > 0) {
        const res = await apiRequest("PATCH", "/api/user/profile", updates);
        return await res.json();
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Check if there's a pending join code - if so, skip Step 3 and join partnership
      const pendingCode = localStorage.getItem("pending_join_code");
      console.log("[Onboarding] Step 2 complete. Pending code:", pendingCode);
      
      if (pendingCode) {
        localStorage.removeItem("pending_join_code");
        localStorage.setItem("hasCompletedOnboarding", "true");
        console.log("[Onboarding] Redirecting to join partnership:", pendingCode);
        setLocation(`/join/${pendingCode}`);
      } else {
        setStep(3);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save details",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setInviteCodeCopied(true);
      toast({ title: "Copied!", description: "Invite code copied to clipboard", duration: 3000 });
      setTimeout(() => setInviteCodeCopied(false), 2000);
    } catch (error) {
      toast({ title: "Failed to copy", variant: "destructive", duration: 5000 });
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteLinkCopied(true);
      toast({ title: "Copied!", description: "Invite link copied to clipboard", duration: 3000 });
      setTimeout(() => setInviteLinkCopied(false), 2000);
    } catch (error) {
      toast({ title: "Failed to copy", variant: "destructive", duration: 5000 });
    }
  };

  const shareMessage = `I'm using PeacePad for co-parenting coordination. Join me: ${inviteLink}`;

  const copyShareMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      toast({ title: "Copied!", description: "Share message copied to clipboard", duration: 3000 });
    } catch (error) {
      toast({ title: "Failed to copy", variant: "destructive", duration: 5000 });
    }
  };

  // Show intro slideshow for users joining via invite link
  if (showIntro) {
    return <LandingIntroSlideshow onComplete={handleIntroComplete} />;
  }

  // Show consent agreement after intro
  if (showConsent) {
    return <ConsentAgreement onAccept={handleConsentAccept} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">Welcome to PeacePad</h1>
            <span className="text-sm text-muted-foreground">Step {step}/3</span>
          </div>
          <CardDescription>
            {step === 1 && "Let's get you set up in just a few steps"}
            {step === 2 && "Help us personalize your experience (optional)"}
            {step === 3 && "Share your invite code with your co-parent"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Welcome & Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Your Name</Label>
                  <Input
                    id="displayName"
                    placeholder="Enter your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    data-testid="input-display-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Profile Photo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 rounded-full border-2 border-border bg-muted flex items-center justify-center overflow-hidden">
                      {profileImagePreview ? (
                        <img src={profileImagePreview} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        data-testid="input-profile-photo"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-upload-photo"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Choose a clear photo so your co-parent can recognize you
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => createGuestAccount.mutate()}
                disabled={!displayName.trim() || createGuestAccount.isPending}
                data-testid="button-continue-step1"
              >
                {createGuestAccount.isPending ? "Creating Account..." : "Continue"}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Optional Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="childName">Child's Name (Optional)</Label>
                  <Input
                    id="childName"
                    placeholder="Enter your child's name"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    data-testid="input-child-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps personalize the experience for co-parenting
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Relationship Type (Optional)</Label>
                  <RadioGroup value={relationshipType} onValueChange={setRelationshipType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ex-spouse" id="ex-spouse" data-testid="radio-ex-spouse" />
                      <Label htmlFor="ex-spouse" className="font-normal cursor-pointer">Ex-Spouse</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="separated" id="separated" data-testid="radio-separated" />
                      <Label htmlFor="separated" className="font-normal cursor-pointer">Separated</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="never-married" id="never-married" data-testid="radio-never-married" />
                      <Label htmlFor="never-married" className="font-normal cursor-pointer">Never Married</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" data-testid="radio-other" />
                      <Label htmlFor="other" className="font-normal cursor-pointer">Other</Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    This information is private and helps us provide relevant resources
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={async () => {
                    // Check if there's a pending join code - if so, skip Step 3 and join partnership
                    const pendingCode = localStorage.getItem("pending_join_code");
                    console.log("[Onboarding] Step 2 skipped. Pending code:", pendingCode);
                    
                    if (pendingCode) {
                      localStorage.removeItem("pending_join_code");
                      localStorage.setItem("hasCompletedOnboarding", "true");
                      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                      console.log("[Onboarding] Redirecting to join partnership:", pendingCode);
                      setLocation(`/join/${pendingCode}`);
                    } else {
                      setStep(3);
                    }
                  }}
                  data-testid="button-skip-step2"
                >
                  Skip
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => updateOptionalDetails.mutate()}
                  disabled={updateOptionalDetails.isPending}
                  data-testid="button-continue-step2"
                >
                  {updateOptionalDetails.isPending ? "Saving..." : "Continue"}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Invite Code */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">Your Invite Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Share this code with your co-parent to connect on PeacePad
                  </p>
                </div>

                {/* Invite Code Display */}
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white dark:bg-card p-4 rounded-lg border-2 border-primary">
                    <span className="text-4xl font-mono font-bold tracking-widest text-primary" data-testid="text-invite-code-display">
                      {inviteCode}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={copyInviteCode}
                    data-testid="button-copy-code"
                  >
                    {inviteCodeCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {inviteCodeCopied ? "Copied!" : "Copy Code"}
                  </Button>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-3 pt-4 border-t">
                  <Label className="text-sm font-medium">Or scan this QR code</Label>
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG value={inviteLink} size={180} data-testid="qr-code" />
                  </div>
                </div>

                {/* Shareable Link */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-medium">Share this link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={inviteLink}
                      readOnly
                      className="font-mono text-sm"
                      data-testid="input-invite-link"
                    />
                    <Button
                      variant="outline"
                      onClick={copyInviteLink}
                      data-testid="button-copy-link"
                    >
                      {inviteLinkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Pre-written Message */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-medium">Quick share message</Label>
                  <div className="relative">
                    <div className="bg-muted p-3 rounded-lg text-sm border">
                      {shareMessage}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyShareMessage}
                      className="absolute top-2 right-2"
                      data-testid="button-copy-message"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={async () => {
                  localStorage.setItem("hasCompletedOnboarding", "true");
                  // Refresh auth state before redirecting
                  await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                  // Check if there's a pending join code from /join/:code link
                  const pendingCode = localStorage.getItem("pending_join_code");
                  if (pendingCode) {
                    localStorage.removeItem("pending_join_code");
                    setLocation(`/join/${pendingCode}`);
                  } else {
                    setLocation("/chat");
                  }
                }}
                data-testid="button-continue-to-app"
              >
                Continue to PeacePad
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
