"use client";

import { createContext, type ReactNode, useContext } from "react";

// Config only, sent once from the root layout (AD-4). Session data comes from
// GET /api/session, never from here.
export type RunMode = {
  readonly testMode: boolean;
  readonly hosted: boolean;
  readonly features: {
    readonly accounts: boolean;
    readonly gaps: boolean;
    readonly rewording: boolean;
    readonly keywordFallback: boolean;
  };
  // What the AI notice shows (FR-24). Names and numbers only: no key, no URL.
  readonly aiNotice: {
    readonly version: string;
    readonly providerName: string;
    readonly retentionDays: number | null;
  };
};

const RunModeContext = createContext<RunMode | null>(null);

export function RunModeProvider({
  value,
  children,
}: {
  value: RunMode;
  children: ReactNode;
}) {
  return <RunModeContext value={value}>{children}</RunModeContext>;
}

export function useRunMode(): RunMode {
  const value = useContext(RunModeContext);
  if (value === null) {
    throw new Error("useRunMode needs a RunModeProvider above it");
  }
  return value;
}
