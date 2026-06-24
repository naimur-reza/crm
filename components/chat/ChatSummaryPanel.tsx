"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeChat } from "@/app/actions/ai/chat-summary";

interface SummaryData {
  summary: string;
  keyTopics: string[];
  actionItems: string[];
}

export function ChatSummaryPanel({ groupId }: { groupId: string }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSummarize = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await summarizeChat(groupId);
      setSummary(result as SummaryData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to summarize");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  if (!summary && !loading && !error) {
    return (
      <Button onClick={handleSummarize} variant="outline" size="sm">
        <Sparkles className="size-3.5" />
        Summarize Chat
      </Button>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="size-4" />
            AI Summary
          </span>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => {
              setSummary(null);
              setError(null);
            }}
          >
            <X className="size-3.5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Generating summary...
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {summary && (
          <div className="space-y-3 text-sm">
            <p>{summary.summary}</p>

            {summary.keyTopics && summary.keyTopics.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Key Topics:
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {summary.keyTopics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summary.actionItems && summary.actionItems.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Action Items:
                </span>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                  {summary.actionItems.map((item) => (
                    <li key={item}>{item}</li>
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
