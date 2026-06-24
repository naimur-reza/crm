"use client";

import { useState, useCallback } from "react";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  findInvoiceMatches,
  acceptInvoiceMatch,
  rejectInvoiceMatch,
  getInvoiceMatchSuggestionsAction,
} from "@/app/actions/ai/invoice-matching";

interface MatchSuggestion {
  id: string;
  confidence: number;
  reasoning: string;
  status: string;
}

export function InvoiceMatchPanel({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFindMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await findInvoiceMatches(invoiceId);
      const result = await getInvoiceMatchSuggestionsAction(invoiceId);
      setMatches(result as unknown as MatchSuggestion[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to find matches");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  const handleAccept = useCallback(async (id: string) => {
    await acceptInvoiceMatch(id);
    setMatches((prev) =>
      prev
        ? prev.map((m) => (m.id === id ? { ...m, status: "accepted" } : m))
        : null,
    );
  }, []);

  const handleReject = useCallback(async (id: string) => {
    await rejectInvoiceMatch(id);
    setMatches((prev) =>
      prev
        ? prev.map((m) => (m.id === id ? { ...m, status: "rejected" } : m))
        : null,
    );
  }, []);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          AI Invoice Matching
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!matches && !loading && (
          <Button onClick={handleFindMatches} variant="outline" size="sm">
            <Sparkles className="size-3.5" />
            Find Matches
          </Button>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Analyzing payments...
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {matches && matches.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            No match suggestions found.
          </p>
        )}

        {matches && matches.length > 0 && (
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        match.confidence > 80
                          ? "green"
                          : match.confidence > 50
                            ? "amber"
                            : "slate"
                      }
                    >
                      {match.confidence}% match
                    </Badge>
                    {match.status === "accepted" && (
                      <Badge tone="green">Accepted</Badge>
                    )}
                    {match.status === "rejected" && (
                      <Badge tone="red">Rejected</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">{match.reasoning}</p>
                </div>
                {match.status === "pending" && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleAccept(match.id)}
                    >
                      <Check className="size-3.5 text-green-600" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleReject(match.id)}
                    >
                      <X className="size-3.5 text-red-600" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
