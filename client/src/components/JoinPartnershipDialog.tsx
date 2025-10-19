import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { UserPlus, Loader2, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

interface JoinPartnershipDialogProps {
  trigger?: React.ReactNode;
}

export function JoinPartnershipDialog({ trigger }: JoinPartnershipDialogProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const joinPartnershipMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/partnerships/join", {
        inviteCode: code.toUpperCase(),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partnerships"] });
      toast({
        title: "Partnership created",
        description: "You're now connected with your co-parent",
        duration: 3000,
      });
      setInviteCode("");
      setIsOpen(false);
    },
    onError: (error: any) => {
      const message = error.message || "Failed to join partnership";
      const isInvalidCode = message.includes("Invalid invite code");
      toast({
        title: isInvalidCode ? "Code not found" : "Error",
        description: isInvalidCode 
          ? "This invite code doesn't exist. Ask your co-parent to check their code in Settings and share the current one."
          : message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim().length === 6) {
      joinPartnershipMutation.mutate(inviteCode.trim());
    } else {
      toast({
        title: "Invalid code",
        description: "Invite code must be 6 characters",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="gap-2"
            data-testid="button-join-partnership"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Co-Parent</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-join-partnership">
        <DialogHeader>
          <DialogTitle>Add Your Co-Parent</DialogTitle>
          <DialogDescription>
            Enter your co-parent's 6-character invite code to connect
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 mb-4">
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">How invite codes work:</p>
                <p className="text-blue-800 dark:text-blue-200">
                  Ask your co-parent to go to <span className="font-semibold">Settings</span>, copy <strong>their invite code</strong>, and share it with you. Then enter it below to connect.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-code">Your Co-Parent's Invite Code</Label>
            <Input
              id="invite-code"
              placeholder="ABC123"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center text-lg tracking-widest font-mono"
              data-testid="input-invite-code"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-character code your co-parent shared with you
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={inviteCode.length !== 6 || joinPartnershipMutation.isPending}
            data-testid="button-submit-invite-code"
          >
            {joinPartnershipMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
