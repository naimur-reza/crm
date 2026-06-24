import { Zap, Thermometer, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const labelConfig = {
  hot: { tone: "red" as const, icon: Zap, label: "Hot" },
  warm: { tone: "amber" as const, icon: Thermometer, label: "Warm" },
  cold: { tone: "blue" as const, icon: Snowflake, label: "Cold" },
};

export function LeadScoreBadge({
  score,
  label,
}: {
  score: number;
  label: "hot" | "warm" | "cold";
}) {
  const config = labelConfig[label];
  return (
    <Badge tone={config.tone} icon={config.icon} title={`Score: ${score}/100`}>
      {config.label} {score}
    </Badge>
  );
}

export function LeadScoreSkeleton() {
  return (
    <span className="inline-flex h-6 w-20 animate-pulse rounded-full bg-muted" />
  );
}
