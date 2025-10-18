import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, CheckCircle2 } from "lucide-react";

interface ConsentAgreementProps {
  onAccept: () => void;
}

export default function ConsentAgreement({ onAccept }: ConsentAgreementProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const scrolledToBottom =
      target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    
    if (scrolledToBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (hasAccepted && hasScrolledToBottom) {
      onAccept();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Shield className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">User Consent & Terms of Service</h1>
            <p className="text-muted-foreground">
              Please read and accept the following terms before continuing
            </p>
          </div>

          <ScrollArea
            className="h-[500px] rounded-md border p-6"
            onScrollCapture={handleScroll}
            ref={scrollAreaRef}
          >
            <div className="space-y-6 text-sm">
              {/* Introduction */}
              <section>
                <h2 className="text-xl font-semibold mb-3">Terms of Service Agreement</h2>
                <p className="text-muted-foreground leading-relaxed">
                  This Terms of Service Agreement ("Agreement") is entered into by and between you ("User," "you," or "your") and PeacePad ("Company," "we," "us," or "our"). By accessing or using the PeacePad platform (the "Service"), you acknowledge that you have read, understood, and agree to be bound by all terms and conditions set forth in this Agreement.
                </p>
              </section>

              {/* Communication Recording */}
              <section>
                <h3 className="text-lg font-semibold mb-2">1. Communication Recording and Storage</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>1.1 Recording of Communications:</strong> You acknowledge and expressly consent that ALL communications transmitted through the Service, including but not limited to text messages, audio calls, video calls, voice messages, file uploads, and any other form of communication, may be recorded, stored, and archived by PeacePad.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>1.2 Purpose of Recording:</strong> Recorded communications are stored for the purposes of: (a) facilitating co-parenting coordination and documentation; (b) providing evidence for legal proceedings if requested by you or required by law; (c) improving Service quality and functionality; (d) ensuring compliance with legal and regulatory requirements; and (e) protecting the rights and safety of all parties.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>1.3 Legal Compliance:</strong> You represent and warrant that you have obtained all necessary consents and permissions required by applicable law to record and store communications with other parties using the Service. You agree that it is your sole responsibility to comply with all applicable recording and consent laws in your jurisdiction.
                </p>
              </section>

              {/* AI Analysis */}
              <section>
                <h3 className="text-lg font-semibold mb-2">2. Artificial Intelligence Analysis</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>2.1 AI-Powered Features:</strong> The Service utilizes artificial intelligence and machine learning technologies ("AI Technologies") to provide features including, but not limited to: (a) tone analysis and detection; (b) conflict identification; (c) communication improvement suggestions; (d) scheduling conflict detection; (e) emotional tone analysis during calls (opt-in feature); and (f) content moderation.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>2.2 AI Processing Consent:</strong> You expressly consent to the processing of your communications and behavioral data through AI Technologies. This processing may include analysis of text content, voice recordings, video recordings, communication patterns, and metadata associated with your communications.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>2.3 AI Limitations:</strong> You acknowledge that AI Technologies are not perfect and may produce inaccurate, incomplete, or misleading results. AI-generated insights, suggestions, and analyses are provided for informational purposes only and do NOT constitute professional advice of any kind, including but not limited to legal, medical, psychological, or therapeutic advice.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>2.4 No Reliance on AI:</strong> You agree that you will not rely solely on AI-generated content for making important decisions related to co-parenting, legal matters, child welfare, or any other significant matters. You should always consult with appropriate professionals (attorneys, therapists, mediators, etc.) before making important decisions.
                </p>
              </section>

              {/* Data Retention */}
              <section>
                <h3 className="text-lg font-semibold mb-2">3. Data Retention and Storage Policies</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>3.1 Retention Period:</strong> Communications and associated data will be retained indefinitely unless you request deletion. We reserve the right to retain data for longer periods as required by law, legal proceedings, or for the protection of our legal rights.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>3.2 Data Security:</strong> We implement commercially reasonable security measures to protect your data. However, you acknowledge that no system is completely secure, and we cannot guarantee the absolute security of your data.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>3.3 Third-Party Storage:</strong> Your data may be stored on third-party servers and cloud infrastructure providers. By using the Service, you consent to such storage arrangements.
                </p>
              </section>

              {/* Export Rights */}
              <section>
                <h3 className="text-lg font-semibold mb-2">4. Data Export Rights for Legal Proceedings</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>4.1 Export Functionality:</strong> The Service provides functionality to export your communications and data for use in legal proceedings, family court matters, custody disputes, and other legal purposes.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>4.2 Legal Use:</strong> Exported data may be used as evidence in legal proceedings. You acknowledge that communications stored in the Service may be subject to discovery, subpoena, or court order.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>4.3 Admissibility:</strong> We make no representations or warranties regarding the admissibility of exported data in any legal proceeding. Admissibility is determined by applicable court rules and the discretion of the presiding judge.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>4.4 Authenticity:</strong> While we provide audit trails and metadata to support authenticity claims, you are responsible for establishing the authenticity and admissibility of exported data in any legal proceeding.
                </p>
              </section>

              {/* Privacy Between Co-Parents */}
              <section>
                <h3 className="text-lg font-semibold mb-2">5. Privacy Between Co-Parents</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>5.1 Communication Privacy:</strong> Direct 1:1 communications between you and a specific co-parent are private and visible only to the participants in that conversation, except as required by law or court order.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>5.2 Group Conversations:</strong> Group conversations are visible to all members of the group. You should exercise discretion when sharing information in group conversations.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>5.3 No Expectation of Complete Privacy:</strong> You acknowledge that communications through the Service should not be considered completely private, as they may be subject to legal discovery, court orders, or disclosure as required by law.
                </p>
              </section>

              {/* Optional Features */}
              <section>
                <h3 className="text-lg font-semibold mb-2">6. Optional Features and Consent</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>6.1 Call Recording:</strong> Audio and video call recording is an optional feature that requires explicit consent from all participants. By enabling this feature, you consent to the recording of your calls and agree to obtain consent from other participants as required by law.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>6.2 Emotion Analysis:</strong> Real-time emotional tone analysis during calls is an optional feature. By enabling this feature, you consent to AI analysis of your voice, speech patterns, and emotional indicators during calls.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>6.3 Permission Management:</strong> You can manage permissions for optional features through partnership settings. Changes to permissions may not apply retroactively to previously recorded or analyzed content.
                </p>
              </section>

              {/* Liability Limitations and Disclaimers */}
              <section>
                <h3 className="text-lg font-semibold mb-2">7. Limitation of Liability and Disclaimers</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>7.1 SERVICE PROVIDED "AS IS":</strong> THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, OR ANY WARRANTIES ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>7.2 NO PROFESSIONAL ADVICE:</strong> THE SERVICE DOES NOT PROVIDE LEGAL, MEDICAL, PSYCHOLOGICAL, THERAPEUTIC, OR ANY OTHER PROFESSIONAL ADVICE. ANY INFORMATION, SUGGESTIONS, OR INSIGHTS PROVIDED BY THE SERVICE, INCLUDING AI-GENERATED CONTENT, ARE FOR INFORMATIONAL PURPOSES ONLY AND SHOULD NOT BE CONSTRUED AS PROFESSIONAL ADVICE.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>7.3 LIMITATION OF DAMAGES:</strong> TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL PEACEPAD, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO YOUR USE OF OR INABILITY TO USE THE SERVICE.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>7.4 MAXIMUM LIABILITY:</strong> TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, PEACEPAD'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THIS AGREEMENT OR YOUR USE OF THE SERVICE SHALL NOT EXCEED THE GREATER OF: (A) THE AMOUNT YOU HAVE PAID TO PEACEPAD IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM; OR (B) ONE HUNDRED DOLLARS ($100.00 USD).
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>7.5 NO LIABILITY FOR USER CONDUCT:</strong> PeacePad is not responsible for the conduct, communications, or actions of any user of the Service. You are solely responsible for your interactions with other users and for all content you transmit through the Service.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>7.6 NO LIABILITY FOR TECHNICAL ISSUES:</strong> PeacePad shall not be liable for any loss or damage resulting from: (a) service interruptions, downtime, or technical failures; (b) data loss or corruption; (c) security breaches or unauthorized access; (d) errors, bugs, or defects in the Service; or (e) third-party service failures.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>7.7 NO LIABILITY FOR LEGAL OUTCOMES:</strong> PeacePad makes no representations or warranties regarding the impact of using the Service on any legal proceedings, custody arrangements, family court matters, or other legal outcomes. We are not responsible for any adverse legal outcomes that may result from your use of the Service.
                </p>
              </section>

              {/* Indemnification */}
              <section>
                <h3 className="text-lg font-semibold mb-2">8. Indemnification</h3>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>8.1 Your Indemnification Obligation:</strong> You agree to indemnify, defend, and hold harmless PeacePad, its affiliates, officers, directors, employees, agents, licensors, and service providers from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to: (a) your use of the Service; (b) your violation of this Agreement; (c) your violation of any rights of another party; (d) your violation of any applicable laws or regulations; (e) any content you submit or transmit through the Service; (f) your interactions with other users; or (g) any claims related to the recording or use of communications in legal proceedings.
                </p>
              </section>

              {/* Dispute Resolution */}
              <section>
                <h3 className="text-lg font-semibold mb-2">9. Dispute Resolution and Arbitration</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>9.1 Binding Arbitration:</strong> Any dispute, claim, or controversy arising out of or relating to this Agreement or your use of the Service shall be settled by binding arbitration in accordance with the rules of the American Arbitration Association.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  <strong>9.2 Class Action Waiver:</strong> YOU AGREE THAT ANY ARBITRATION OR LEGAL PROCEEDING SHALL BE CONDUCTED IN YOUR INDIVIDUAL CAPACITY ONLY AND NOT AS A CLASS ACTION OR OTHER REPRESENTATIVE ACTION. YOU EXPRESSLY WAIVE YOUR RIGHT TO FILE A CLASS ACTION OR SEEK RELIEF ON A CLASS BASIS.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>9.3 Governing Law:</strong> This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which PeacePad is incorporated, without regard to conflict of law principles.
                </p>
              </section>

              {/* Modifications */}
              <section>
                <h3 className="text-lg font-semibold mb-2">10. Modifications to Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  PeacePad reserves the right to modify this Agreement at any time. We will notify you of material changes through the Service or via email. Your continued use of the Service after such modifications constitutes your acceptance of the updated terms.
                </p>
              </section>

              {/* Severability */}
              <section>
                <h3 className="text-lg font-semibold mb-2">11. Severability</h3>
                <p className="text-muted-foreground leading-relaxed">
                  If any provision of this Agreement is found to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.
                </p>
              </section>

              {/* Entire Agreement */}
              <section>
                <h3 className="text-lg font-semibold mb-2">12. Entire Agreement</h3>
                <p className="text-muted-foreground leading-relaxed">
                  This Agreement constitutes the entire agreement between you and PeacePad regarding your use of the Service and supersedes all prior agreements and understandings.
                </p>
              </section>

              {/* Acknowledgment */}
              <section className="mt-8 p-4 bg-muted/50 rounded-lg border-2 border-primary/20">
                <h3 className="text-lg font-semibold mb-2">Acknowledgment of Understanding</h3>
                <p className="text-muted-foreground leading-relaxed">
                  BY ACCEPTING THIS AGREEMENT, YOU ACKNOWLEDGE THAT: (1) YOU HAVE READ AND UNDERSTOOD ALL TERMS AND CONDITIONS; (2) YOU HAVE HAD THE OPPORTUNITY TO CONSULT WITH LEGAL COUNSEL IF DESIRED; (3) YOU VOLUNTARILY AGREE TO BE BOUND BY THESE TERMS; (4) YOU UNDERSTAND THE LIMITATIONS OF LIABILITY AND WARRANTY DISCLAIMERS; AND (5) YOU CONSENT TO THE RECORDING, STORAGE, AND AI ANALYSIS OF YOUR COMMUNICATIONS AS DESCRIBED HEREIN.
                </p>
              </section>

              <div className="h-8" /> {/* Spacer to ensure scroll */}
            </div>
          </ScrollArea>

          {!hasScrolledToBottom && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground animate-pulse">
                Please scroll to the bottom to continue
              </p>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div className="flex items-start space-x-3 p-4 rounded-lg border">
              <Checkbox
                id="consent"
                checked={hasAccepted}
                onCheckedChange={(checked) => setHasAccepted(checked as boolean)}
                disabled={!hasScrolledToBottom}
                data-testid="checkbox-consent"
              />
              <div className="flex-1">
                <label
                  htmlFor="consent"
                  className={`text-sm font-medium leading-relaxed cursor-pointer ${
                    !hasScrolledToBottom ? "text-muted-foreground" : ""
                  }`}
                >
                  I have read, understood, and agree to be bound by the Terms of Service Agreement. I consent to the recording, storage, and AI analysis of my communications as described above. I understand that PeacePad does not provide professional advice and that I should consult with appropriate professionals for legal, medical, or therapeutic guidance.
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleAccept}
                disabled={!hasAccepted || !hasScrolledToBottom}
                data-testid="button-accept-consent"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {!hasScrolledToBottom
                  ? "Scroll to Continue"
                  : !hasAccepted
                  ? "Accept to Continue"
                  : "Continue to Registration"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
