import { Badge } from "@/components/ui/badge";
import { Smile, Meh, Frown, AlertTriangle } from "lucide-react";

export type ToneType = "calm" | "cooperative" | "neutral" | "frustrated" | "defensive" | "hostile";

interface TonePillProps {
  tone: ToneType;
  summary: string;
}

const toneConfig = {
  calm: {
    icon: Smile,
    color: "bg-chart-1/10 text-chart-1 border-chart-1/20",
    label: "Calm",
  },
  cooperative: {
    icon: Smile,
    color: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    label: "Cooperative",
  },
  neutral: {
    icon: Meh,
    color: "bg-muted text-muted-foreground border-muted",
    label: "Neutral",
  },
  frustrated: {
    icon: Frown,
    color: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    label: "Frustrated",
  },
  defensive: {
    icon: AlertTriangle,
    color: "bg-chart-5/10 text-chart-5 border-chart-5/20",
    label: "Defensive",
  },
  hostile: {
    icon: AlertTriangle,
    color: "bg-destructive/10 text-destructive border-destructive/20",
    label: "Hostile",
  },
};

export default function TonePill({ tone, summary }: TonePillProps) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-1.5 animate-fade-in">
      <Badge
        variant="outline"
        className={`${config.color} text-xs font-medium gap-1.5 border rounded-full px-3 py-1 shadow-sm`}
        data-testid={`badge-tone-${tone}`}
      >
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </Badge>
      {summary && (
        <p className="text-xs italic text-muted-foreground leading-relaxed max-w-xs">
          {summary}
        </p>
      )}
    </div>
  );
}
