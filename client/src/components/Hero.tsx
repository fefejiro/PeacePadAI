import { Button } from "@/components/ui/button";
import { MessageCircle, Shield } from "lucide-react";
import heroImage from "@assets/stock_images/peaceful_diverse_fam_f2239163.jpg";

export default function Hero() {
  const handleGetStarted = () => {
    console.log("Get Started clicked");
  };

  const handleLearnMore = () => {
    console.log("Learn More clicked");
  };

  return (
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
              onClick={handleGetStarted}
              data-testid="button-get-started"
            >
              <Shield className="mr-2 h-5 w-5" />
              Get Started Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="backdrop-blur-md bg-white/10 border-white/40 text-white hover:bg-white/20"
              onClick={handleLearnMore}
              data-testid="button-learn-more"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
