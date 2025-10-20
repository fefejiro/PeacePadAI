import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Phone, PhoneOff, Video, User } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRingtone } from "@/hooks/use-ringtone";

interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerProfileImageUrl?: string;
  callType: 'audio' | 'video';
}

interface IncomingCallModalProps {
  call: IncomingCall | null;
  onAccept: (callId: string) => void;
  onDecline: (callId: string, reason?: string) => void;
}

const DECLINE_REASONS = [
  "Busy right now",
  "Not a good time",
  "Will call back later",
  "Kids need attention",
  "At work",
];

export function IncomingCallModal({ call, onAccept, onDecline }: IncomingCallModalProps) {
  const { toast } = useToast();
  const [showDeclineReasons, setShowDeclineReasons] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const { play, stop } = useRingtone();

  // Play ringtone when call comes in
  useEffect(() => {
    if (call) {
      play();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [call, play, stop]);

  const acceptCallMutation = useMutation({
    mutationFn: async (callId: string) => {
      const response = await fetch(`/api/calls/${callId}/accept`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (_, callId) => {
      stop();
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
      onAccept(callId);
    },
    onError: (error: any) => {
      stop();
      toast({
        title: "Failed to accept call",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const declineCallMutation = useMutation({
    mutationFn: async ({ callId, reason }: { callId: string; reason?: string }) => {
      const response = await fetch(`/api/calls/${callId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (_, { callId, reason }) => {
      stop();
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
      onDecline(callId, reason);
    },
    onError: (error: any) => {
      stop();
      toast({
        title: "Failed to decline call",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    if (call) {
      acceptCallMutation.mutate(call.callId);
    }
  };

  const handleDecline = () => {
    if (!call) return;

    if (showDeclineReasons && selectedReason) {
      declineCallMutation.mutate({ callId: call.callId, reason: selectedReason });
    } else if (showDeclineReasons) {
      toast({
        title: "Select a reason",
        description: "Please select a reason for declining",
        variant: "destructive",
      });
    } else {
      setShowDeclineReasons(true);
    }
  };

  const handleQuickDecline = () => {
    if (call) {
      declineCallMutation.mutate({ callId: call.callId });
    }
  };

  if (!call) return null;

  const isEmoji = call.callerProfileImageUrl?.startsWith("emoji:");
  const emojiValue = isEmoji && call.callerProfileImageUrl
    ? call.callerProfileImageUrl.replace("emoji:", "")
    : "";

  return (
    <Dialog open={!!call} onOpenChange={(open) => {
      if (!open && call) {
        handleQuickDecline();
      }
    }}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="dialog-incoming-call"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {!showDeclineReasons ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Incoming Call</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center gap-6 py-6">
              {/* Caller Avatar */}
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  {isEmoji ? (
                    <div className="flex items-center justify-center text-5xl">
                      {emojiValue}
                    </div>
                  ) : call.callerProfileImageUrl ? (
                    <AvatarImage src={call.callerProfileImageUrl} alt={call.callerName} />
                  ) : (
                    <AvatarFallback>
                      <User className="w-12 h-12" />
                    </AvatarFallback>
                  )}
                </Avatar>
                
                {/* Call Type Badge */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  {call.callType === 'video' ? (
                    <>
                      <Video className="w-3 h-3" />
                      Video
                    </>
                  ) : (
                    <>
                      <Phone className="w-3 h-3" />
                      Audio
                    </>
                  )}
                </div>
              </div>

              {/* Caller Name */}
              <div className="text-center">
                <h3 className="text-xl font-semibold" data-testid="text-caller-name">
                  {call.callerName}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Calling...
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 w-full max-w-xs">
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleDecline}
                  disabled={declineCallMutation.isPending}
                  className="flex-1 gap-2"
                  data-testid="button-decline-call"
                >
                  <PhoneOff className="w-5 h-5" />
                  Decline
                </Button>
                <Button
                  size="lg"
                  onClick={handleAccept}
                  disabled={acceptCallMutation.isPending}
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                  data-testid="button-accept-call"
                >
                  <Phone className="w-5 h-5" />
                  Accept
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Decline Reason</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Let {call.callerName} know why you can't answer
              </p>

              <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                {DECLINE_REASONS.map((reason) => (
                  <div
                    key={reason}
                    className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate cursor-pointer"
                    onClick={() => setSelectedReason(reason)}
                    data-testid={`reason-${reason.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <RadioGroupItem value={reason} id={reason} />
                    <Label htmlFor={reason} className="flex-1 cursor-pointer">
                      {reason}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeclineReasons(false)}
                  className="flex-1"
                  data-testid="button-back"
                >
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDecline}
                  disabled={!selectedReason || declineCallMutation.isPending}
                  className="flex-1"
                  data-testid="button-confirm-decline"
                >
                  {declineCallMutation.isPending ? "Declining..." : "Decline Call"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
