import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, MessageCircle, Calendar, DollarSign, Heart, Sparkles } from "lucide-react";

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
      title: "Welcome to PeacePad",
      subtitle: "Your peaceful co-parenting communication platform",
      icon: Sparkles,
      gradient: "from-blue-500/20 to-purple-500/20",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-2xl opacity-30 animate-pulse" />
            <Sparkles className="h-24 w-24 text-primary relative z-10" />
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground">Welcome to PeacePad</h2>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Making co-parenting communication more peaceful, balanced, and emotionally aware
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
      id: 2,
      title: "Key Features",
      subtitle: "Everything you need for effective co-parenting",
      icon: MessageCircle,
      gradient: "from-emerald-500/20 to-teal-500/20",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-6 text-foreground">Key Features</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg">
            Communicate, organize, and find support — all in one place
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div className="p-4 rounded-lg bg-card border text-left">
              <MessageCircle className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1 text-sm">AI-Powered Chat</h3>
              <p className="text-xs text-muted-foreground">Tone analysis for peaceful messaging</p>
            </div>
            <div className="p-4 rounded-lg bg-card border text-left">
              <Calendar className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1 text-sm">Shared Calendar</h3>
              <p className="text-xs text-muted-foreground">Coordinate custody & events</p>
            </div>
            <div className="p-4 rounded-lg bg-card border text-left">
              <DollarSign className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1 text-sm">Expense Tracking</h3>
              <p className="text-xs text-muted-foreground">Split & track costs transparently</p>
            </div>
            <div className="p-4 rounded-lg bg-card border text-left">
              <Heart className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1 text-sm">Find Support</h3>
              <p className="text-xs text-muted-foreground">Free resources & therapists nearby</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: "Get Started",
      subtitle: "Begin your peaceful communication journey",
      icon: Sparkles,
      gradient: "from-cyan-500/20 to-blue-500/20",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 blur-2xl opacity-30 animate-pulse" />
            <Sparkles className="h-24 w-24 text-primary relative z-10" />
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground">Get Started</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            Ready to experience more peaceful co-parenting communication?
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
            This intro will only appear on your first visit
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
