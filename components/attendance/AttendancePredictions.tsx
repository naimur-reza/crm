"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { predictAttendance } from "@/app/actions/ai/attendance-predictions";

const statusConfig = {
  present: { tone: "green" as const, label: "Present" },
  late: { tone: "amber" as const, label: "Late" },
  absent: { tone: "red" as const, label: "Absent" },
  leave: { tone: "blue" as const, label: "On Leave" },
};

interface PredictionResult {
  predictedStatus: "present" | "late" | "absent" | "leave";
  confidence: number;
  reasoning: string;
  riskFactors: string[];
}

export function AttendancePredictions({
  employeeId,
}: {
  employeeId: string;
}) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await predictAttendance(employeeId, date);
      setPrediction(result as PredictionResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  }, [employeeId, date]);

  const config = prediction
    ? statusConfig[prediction.predictedStatus]
    : null;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          AI Attendance Prediction
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
          />
          <Button
            onClick={handlePredict}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Predict
          </Button>
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}

        {prediction && config && (
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Prediction for {date}:
              </span>
              <Badge tone={config.tone}>{config.label}</Badge>
              <span className="text-xs text-muted-foreground">
                ({prediction.confidence}% confidence)
              </span>
            </div>
            <p className="text-muted-foreground">{prediction.reasoning}</p>
            {prediction.riskFactors && prediction.riskFactors.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Risk Factors:
                </span>
                <ul className="mt-0.5 list-inside list-disc text-muted-foreground">
                  {prediction.riskFactors.map((factor) => (
                    <li key={factor}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
