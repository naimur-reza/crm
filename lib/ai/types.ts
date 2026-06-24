export type SentimentLabel = "positive" | "negative" | "neutral" | "mixed";

export interface SentimentResult {
  label: SentimentLabel;
  score: number;
  keyPhrases: string[];
}

export interface LeadScoreResult {
  score: number;
  label: "hot" | "warm" | "cold";
  reasoning: string;
}

export interface ChatSummaryResult {
  summary: string;
  keyTopics: string[];
  actionItems: string[];
}

export interface InvoiceMatchResult {
  match: boolean;
  confidence: number;
  reasoning: string;
}

export interface AttendancePredictionResult {
  predictedStatus: "present" | "late" | "absent" | "leave";
  confidence: number;
  reasoning: string;
  riskFactors: string[];
}
