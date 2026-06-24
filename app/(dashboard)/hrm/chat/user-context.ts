"use client";

import { createContext, useContext } from "react";
import type { CurrentUser } from "@/lib/auth/session";

export const UserContext = createContext<CurrentUser | null>(null);

export function useCurrentUser() {
  return useContext(UserContext);
}
