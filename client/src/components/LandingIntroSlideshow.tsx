import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, MessageCircle, Calendar, DollarSign, PawPrint, Heart, Sparkles } from "lucide-react";

interface LandingIntroSlideshowProps {
  onComplete: () => void;
}

export default function LandingIntroSlideshow({ onComplete }: LandingIntroSlideshowProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const handleComplete = () => {
    localStorage.setItem("hasSeenIntro", "true");
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem("hasSeenIntro", "true");
    onComplete();
  };

  const slides = [
    {
      id: 1,
      title: "Welcome to PeacePadAI",
      subtitle: "Your peaceful digital companion for better communication and care",
      icon: Sparkles,
      gradient: "from-blue-500/20 to-purple-500/20",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-2xl opacity-30 animate-pulse" />
            <Sparkles className="h-24 w-24 text-primary relative z-10" />
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground">Welcome to PeacePadAI</h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Your peaceful digital companion for better communication and care
          </p>
        </div>
      ),
    },
    {
      id: 2,
      title: "What PeacePad Does",
      subtitle: "Communicate better, manage responsibilities, support well-being",
      icon: MessageCircle,
      gradient: "from-emerald-500/20 to-teal-500/20",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-6 text-foreground">What PeacePad Does</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg">
            PeacePad helps you communicate better, manage shared responsibilities, and support emotional well-being
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="p-4 rounded-lg bg-card border">
              <MessageCircle className="h-8 w-8 text-primary mb-2 mx-auto" />
              <p className="text-sm font-medium">Chat</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <Calendar className="h-8 w-8 text-primary mb-2 mx-auto" />
              <p className="text-sm font-medium">Scheduling</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <DollarSign className="h-8 w-8 text-primary mb-2 mx-auto" />
              <p className="text-sm font-medium">Expenses</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <Heart className="h-8 w-8 text-primary mb-2 mx-auto" />
              <p className="text-sm font-medium">Emotion AI</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: "The Mission",
      subtitle: "Making communication more peaceful and emotionally aware",
      icon: Heart,
      gradient: "from-rose-500/20 to-pink-500/20",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="mb-6">
            <Heart className="h-20 w-20 text-primary mx-auto animate-pulse" />
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground">The Mission</h2>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            PeacePad's goal is to make co-parenting, family, and personal communication more peaceful, 
            balanced, and emotionally aware
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>Peaceful</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
              <span>Balanced</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-300" />
              <span>Aware</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      title: "Smart Scheduling & Shared Expenses",
      subtitle: "Plan, share, and stay organized — all in one place",
      icon: Calendar,
      gradient: "from-amber-500/20 to-orange-500/20",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground">Smart Scheduling & Expenses</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            Plan, share, and stay organized — all in one place
          </p>
          <div className="space-y-4 max-w-lg">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-card border text-left">
              <Calendar className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Scheduling</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage shared calendars for kids, family, or personal events
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-card border text-left">
              <DollarSign className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Shared Expenses</h3>
                <p className="text-sm text-muted-foreground">
                  Log, split, and track costs transparently (groceries, childcare, activities)
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      title: "Pet Care & Household Harmony",
      subtitle: "Every family member — even the furry ones — matters",
      icon: PawPrint,
      gradient: "from-green-500/20 to-emerald-500/20",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="mb-6">
            <PawPrint className="h-20 w-20 text-primary mx-auto" />
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground">Pet Care & Household</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            Because every family member — even the furry ones — matters
          </p>
          <div className="space-y-3 max-w-md text-left">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <p className="text-sm">Pet profiles (vet visits, reminders, shared care logs)</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <p className="text-sm">Family task reminders (feeding, grooming, playtime)</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 6,
      title: "Find Peace & Support",
      subtitle: "Connect with nearby therapists, counsellors, and family coaches",
      icon: Heart,
      gradient: "from-violet-500/20 to-purple-500/20",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 blur-xl opacity-30" />
            <Heart className="h-20 w-20 text-primary relative z-10" />
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground">Find Peace & Support</h2>
          <p className="text-lg text-muted-foreground max-w-lg">
            PeacePad connects you with nearby therapists, counsellors, and family coaches
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {["Therapists", "Counsellors", "Family Coaches", "Support Groups"].map((item) => (
              <div key={item} className="px-4 py-2 rounded-full bg-primary/10 text-sm font-medium">
                {item}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 7,
      title: "Start Your Journey",
      subtitle: "Begin your peaceful communication experience",
      icon: Sparkles,
      gradient: "from-cyan-500/20 to-blue-500/20",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 blur-2xl opacity-30 animate-pulse" />
            <Sparkles className="h-24 w-24 text-primary relative z-10" />
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground">Start Your Journey</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            Ready to experience more peaceful communication?
          </p>
          <Button
            size="lg"
            onClick={handleComplete}
            className="gap-2"
            data-testid="button-continue-to-peacepad"
          >
            Continue to PeacePad
            <ChevronRight className="h-5 w-5" />
          </Button>
          <p className="mt-6 text-sm text-muted-foreground">
            This slideshow will only appear the first time you visit
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Skip Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSkip}
        className="absolute top-4 right-4 z-20 gap-2"
        data-testid="button-skip-intro"
      >
        <X className="h-4 w-4" />
        Skip Intro
      </Button>

      {/* Carousel */}
      <div className="h-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide) => (
            <div key={slide.id} className="relative flex-[0_0_100%] min-w-0">
              <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`} />
              <div className="relative h-full flex items-center justify-center">
                {slide.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-8 px-4">
        <Button
          variant="outline"
          size="icon"
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          className="shrink-0"
          data-testid="button-prev-slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Progress Indicators */}
        <div className="flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`h-2 rounded-full transition-all ${
                index === selectedIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              data-testid={`indicator-slide-${index}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={scrollNext}
          disabled={!canScrollNext}
          className="shrink-0"
          data-testid="button-next-slide"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
