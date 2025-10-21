import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface TermsAcceptanceDialogProps {
  open: boolean;
  userId: string;
}

export function TermsAcceptanceDialog({ open, userId }: TermsAcceptanceDialogProps) {
  const [hasRead, setHasRead] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { toast } = useToast();

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/users/accept-terms");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Terms Accepted",
        description: "Welcome to PeacePad!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to accept terms. Please try again.",
        variant: "destructive",
      });
      console.error("Error accepting terms:", error);
    },
  });

  const handleAccept = () => {
    if (!agreed) {
      toast({
        title: "Agreement Required",
        description: "Please check the box to agree to the terms.",
        variant: "destructive",
      });
      return;
    }
    acceptTermsMutation.mutate();
  };

  return (
    <Dialog open={open} modal>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl">Terms & Conditions</DialogTitle>
          <DialogDescription>
            Please read and accept our terms to continue using PeacePad
          </DialogDescription>
        </DialogHeader>

        <ScrollArea 
          className="flex-1 pr-4 my-4"
          onScrollCapture={(e) => {
            const element = e.currentTarget;
            const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
            if (isNearBottom && !hasRead) {
              setHasRead(true);
            }
          }}
        >
          <div className="space-y-6 text-sm">
            {/* Introduction */}
            <section>
              <h3 className="text-base font-semibold mb-2">1. Introduction</h3>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to PeacePad. By accessing or using our co-parenting communication platform, 
                you agree to be bound by these Terms and Conditions, including the Non-Disclosure 
                Agreement (NDA) outlined below.
              </p>
            </section>

            {/* NDA Section - Highlighted */}
            <section className="border-l-4 border-primary pl-4 bg-primary/5 py-3 rounded-r">
              <h3 className="text-base font-semibold mb-2">2. Non-Disclosure Agreement (NDA)</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-1">2.1 Confidential Information</h4>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    All communications, messages, notes, tasks, schedules, and any other content 
                    shared through PeacePad are considered private and confidential between you 
                    and your co-parent(s).
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">2.2 Your Obligations</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-2">
                    <li>Keep all information shared on PeacePad strictly confidential</li>
                    <li>Not disclose, share, or distribute content without explicit consent</li>
                    <li>Use information solely for co-parenting purposes</li>
                    <li>Not share screenshots or recordings without permission</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">2.3 Exceptions</h4>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    This NDA does not apply to: (a) information required by law or court order; 
                    (b) child safety concerns that must be reported; or (c) information necessary 
                    for legal proceedings related to custody.
                  </p>
                </div>
              </div>
            </section>

            {/* Privacy */}
            <section>
              <h3 className="text-base font-semibold mb-2">3. Privacy & Data Protection</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Your data is protected using industry-standard encryption. We will never sell your 
                personal information. You can request deletion of your data at any time.
              </p>
            </section>

            {/* Account Security */}
            <section>
              <h3 className="text-base font-semibold mb-2">4. Account Security</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                You are responsible for maintaining the confidentiality of your account and for all 
                activities under your account.
              </p>
            </section>

            {/* Acceptable Use */}
            <section>
              <h3 className="text-base font-semibold mb-2">5. Acceptable Use</h3>
              <p className="text-muted-foreground text-sm mb-1">You agree not to:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-2">
                <li>Harass, threaten, or intimidate other users</li>
                <li>Share illegal, harmful, or inappropriate content</li>
                <li>Attempt unauthorized access to the platform</li>
              </ul>
            </section>

            {/* AI Features */}
            <section>
              <h3 className="text-base font-semibold mb-2">6. AI-Powered Features</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                PeacePad uses AI for tone analysis. While we strive for accuracy, AI is not perfect 
                and should be used as a guide. You are responsible for your communications.
              </p>
            </section>

            {/* Limitation */}
            <section>
              <h3 className="text-base font-semibold mb-2">7. Limitation of Liability</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                PeacePad is a communication tool and does not provide legal or therapeutic advice. 
                Consult qualified professionals for legal or mental health matters.
              </p>
            </section>

            {/* Effective Date */}
            <section className="pt-4 border-t text-xs text-muted-foreground italic">
              <p>Last Updated: October 21, 2025</p>
            </section>
          </div>
        </ScrollArea>

        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="agree-terms"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
              data-testid="checkbox-agree-terms"
            />
            <Label 
              htmlFor="agree-terms" 
              className="text-sm leading-relaxed cursor-pointer"
            >
              I have read and agree to the Terms & Conditions, including the Non-Disclosure Agreement (NDA). 
              I understand that all communications on PeacePad are confidential.
            </Label>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={handleAccept}
              disabled={!agreed || acceptTermsMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-accept-terms"
            >
              {acceptTermsMutation.isPending ? "Accepting..." : "Accept & Continue"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
