import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { UserPlus, Loader2 } from "lucide-react";
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
      });
      setInviteCode("");
      setIsOpen(false);
    },
    onError: (error: any) => {
      const message = error.message || "Failed to join partnership";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
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
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Code</Label>
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
            <p className="text-sm text-muted-foreground">
              Ask your co-parent to share their invite code from Settings
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
