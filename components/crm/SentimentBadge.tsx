import { Smile, Frown, Minus, Meh } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const sentimentConfig = {
  positive: { tone: "green" as const, icon: Smile, label: "Positive" },
  negative: { tone: "red" as const, icon: Frown, label: "Negative" },
  neutral: { tone: "slate" as const, icon: Minus, label: "Neutral" },
  mixed: { tone: "purple" as const, icon: Meh, label: "Mixed" },
};

export function SentimentBadge({
  label,
  score,
}: {
  label: "positive" | "negative" | "neutral" | "mixed";
  score: number;
}) {
  const config = sentimentConfig[label];
  return (
    <Badge
      tone={config.tone}
      icon={config.icon}
      title={`Sentiment score: ${(score / 100).toFixed(2)}`}
    >
      {config.label}
    </Badge>
  );
}

export function SentimentBadgeSkeleton() {
  return (
    <span className="inline-flex h-6 w-20 animate-pulse rounded-full bg-muted" />
  );
}
