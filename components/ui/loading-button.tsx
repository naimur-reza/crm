"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function LoadingButton({
  children,
  loading,
  loadingLabel = "Loading...",
  ...props
}: React.ComponentProps<typeof Button> & {
  loading: boolean;
  loadingLabel?: string;
}) {
  return (
    <Button disabled={loading} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? loadingLabel : children}
    </Button>
  );
}
