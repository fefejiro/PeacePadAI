import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Brain, Calendar, Shield, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LandingIntroSlideshow from "@/components/LandingIntroSlideshow";
import ConsentAgreement from "@/components/ConsentAgreement";
import heroImage from "@assets/stock_images/peaceful_diverse_fam_f2239163.jpg";

export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const { login } = useAuth();

  // Check for intro on first mount
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('hasSeenIntro');
    const hasAcceptedConsent = localStorage.getItem('hasAcceptedConsent');
    
    if (!hasSeenIntro) {
      setShowIntro(true);
    } else if (!hasAcceptedConsent) {
      setShowConsent(true);
    }
  }, []);

  const handleIntroComplete = () => {
    console.log("[Landing] Intro slideshow completed");
    localStorage.setItem('hasSeenIntro', 'true');
    setShowIntro(false);
    setShowConsent(true);
  };

  const handleConsentAccept = () => {
    console.log("[Landing] Consent accepted");
    localStorage.setItem('hasAcceptedConsent', 'true');
    setShowConsent(false);
    
    // Scroll to top to show hero image
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show intro slideshow for first-time visitors
  if (showIntro) {
    return <LandingIntroSlideshow onComplete={handleIntroComplete} />;
  }

  // Show consent agreement after intro
  if (showConsent) {
    return <ConsentAgreement onAccept={handleConsentAccept} />;
  }

  const features = [
    {
      icon: MessageCircle,
      title: "Real-Time Chat",
      description: "Structured, recorded communication designed for co-parents",
    },
    {
      icon: Brain,
      title: "AI Tone Analysis",
      description: "Understand emotional context with intelligent mood detection",
    },
    {
      icon: Calendar,
      title: "Shared Dashboard",
      description: "Coordinate notes, tasks, and child updates in one place",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your family communications are encrypted and protected",
    },
    {
      icon: TrendingUp,
      title: "Mood Trends",
      description: "Track communication patterns over time (coming soon)",
    },
    {
      icon: Users,
      title: "Third-Party Access",
      description: "Optional viewing for mediators or therapists (coming soon)",
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
        <img
          src={heroImage}
          alt="Peaceful co-parenting"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-900/50" />
        
        <div className="relative z-10 flex h-full items-center justify-center px-4">
          <div className="max-w-4xl text-center">
            <div className="mb-6 flex items-center justify-center gap-2">
              <MessageCircle className="h-10 w-10 text-white" />
              <h1 className="text-5xl font-semibold text-white md:text-6xl">
                PeacePad
              </h1>
            </div>
            
            <p className="mb-8 text-xl text-white/90 md:text-2xl">
              Co-parenting communication, powered by empathy and AI
            </p>
            
            <p className="mb-10 text-base text-white/80 md:text-lg">
              Move beyond logistics. PeacePad helps you communicate constructively with real-time tone analysis, 
              ensuring every message builds understanding, not conflict.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                className="backdrop-blur-md bg-white/20 border border-white/30 text-white hover:bg-white/30"
                onClick={login}
                data-testid="button-get-started"
              >
                <Shield className="mr-2 h-5 w-5" />
                Sign in with Google
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Communication built on understanding
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Where most co-parenting apps focus on logistics, PeacePad focuses on emotional clarity 
              and constructive dialogue.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2 text-foreground">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
