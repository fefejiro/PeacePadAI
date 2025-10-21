import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TermsPage() {
  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Terms & Conditions</CardTitle>
          <CardDescription>
            Please read these terms carefully before using PeacePad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] md:h-[70vh] pr-4">
            <div className="space-y-6 text-sm md:text-base">
              {/* Introduction */}
              <section>
                <h2 className="text-lg md:text-xl font-semibold mb-3">1. Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Welcome to PeacePad. By accessing or using our co-parenting communication platform, 
                  you agree to be bound by these Terms and Conditions, including the Non-Disclosure 
                  Agreement (NDA) outlined below. If you do not agree to these terms, please do not 
                  use our services.
                </p>
              </section>

              {/* NDA Section */}
              <section>
                <h2 className="text-lg md:text-xl font-semibold mb-3">2. Non-Disclosure Agreement (NDA)</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">2.1 Confidential Information</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      All communications, messages, notes, tasks, schedules, and any other content 
                      shared through PeacePad ("Confidential Information") are considered private 
                      and confidential between you and your co-parent(s).
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">2.2 User Obligations</h3>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      You agree to:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                      <li>Keep all information shared on PeacePad strictly confidential</li>
                      <li>Not disclose, share, or distribute any content without explicit consent from all parties involved</li>
                      <li>Use information obtained through PeacePad solely for co-parenting purposes</li>
                      <li>Not use screenshots, recordings, or any other means to share content outside the platform without permission</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">2.3 Exceptions</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      This NDA does not apply to information that: (a) is required to be disclosed 
                      by law or court order; (b) relates to child safety or welfare concerns that 
                      must be reported to appropriate authorities; or (c) is necessary for legal 
                      proceedings directly related to custody or co-parenting arrangements.
                    </p>
                  </div>
                </div>
              </section>

              {/* Privacy & Data */}
              <section>
                <h2 className="text-lg md:text-xl font-semibold mb-3">3. Privacy & Data Protection</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We take your privacy seriously. Your data is protected using industry-standard 
                  encryption and security measures.
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>We will never sell your personal information to third parties</li>
                  <li>Your messages and content are encrypted in transit and at rest</li>
                  <li>AI tone analysis is performed securely and privately</li>
                  <li>You can request deletion of your data at any time</li>
                </ul>
              </section>

              {/* Account Security */}
              <section>
                <h2 className="text-lg md:text-xl font-semibold mb-3">4. Account Security</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You are responsible for maintaining the confidentiality of your account credentials 
                  and for all activities that occur under your account. Please use strong 
                  authentication methods and do not share your login information.
                </p>
              </section>

              {/* Acceptable Use */}
              <section>
                <h2 className="text-lg md:text-xl font-semibold mb-3">5. Acceptable Use</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  You agree not to use PeacePad to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Harass, threaten, or intimidate other users</li>
                  <li>Share illegal, harmful, or inappropriate content</li>
                  <li>Attempt to gain unauthorized access to the platform or other users' accounts</li>
                  <li>Use the platform for any purpose other than co-parenting communication</li>
                </ul>
              </section>

              {/* AI Features */}
              <section>
                <h2 className="text-lg md:text-xl font-semibold mb-3">6. AI-Powered Features</h2>
                <p className="text-muted-foreground leading-relaxed">
                  PeacePad uses artificial intelligence to provide tone analysis and communication 
                  suggestions. While we strive for accuracy, AI analysis is not perfect and should 
                  be used as a guide, not absolute truth. You retain full control over your 
                  communications and are responsible for your words and actions.
                </p>
              </section>

              {/* Limitation of Liability */}
              <section>
                <h2 className="text-lg md:text-xl font-semibold mb-3">7. Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  PeacePad is a communication tool and does not provide legal, therapeutic, or 
                  professional advice. We are not responsible for decisions made based on 
                  communications through our platform. For legal matters, custody issues, or 
                  mental health support, please consult qualified professionals.
                </p>
              </section>

              {/* Changes to Terms */}
              <section>
                <h2 className="text-lg md:text-xl font-semibold mb-3">8. Changes to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update these Terms and Conditions from time to time. Continued use of 
                  PeacePad after changes are posted constitutes your acceptance of the revised terms. 
                  We will notify you of significant changes via email or in-app notification.
                </p>
              </section>

              {/* Termination */}
              <section>
                <h2 className="text-lg md:text-xl font-semibold mb-3">9. Termination</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to suspend or terminate your account if you violate these 
                  terms. You may also delete your account at any time through the Settings page.
                </p>
              </section>

              {/* Contact */}
              <section>
                <h2 className="text-lg md:text-xl font-semibold mb-3">10. Contact Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have questions about these Terms and Conditions or the NDA, please contact 
                  us through the Settings page or email support@peacepad.app.
                </p>
              </section>

              {/* Effective Date */}
              <section className="pt-4 border-t">
                <p className="text-sm text-muted-foreground italic">
                  Last Updated: October 21, 2025
                </p>
                <p className="text-sm text-muted-foreground italic mt-1">
                  Effective Date: October 21, 2025
                </p>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
