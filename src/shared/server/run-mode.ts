import "server-only";
import type { RunMode } from "@/shared/ui/run-mode";
import type { Config } from "./config";

// Field by field, never a spread: the client gets config only, no secrets
// (AD-4). A new RunMode field is added here on purpose.
export function toRunMode(config: Config): RunMode {
  return {
    testMode: config.testMode,
    hosted: config.hosted,
    features: {
      accounts: config.features.accounts,
      gaps: config.features.gaps,
      rewording: config.features.rewording,
      keywordFallback: config.features.keywordFallback,
    },
    aiNotice: {
      version: config.aiNotice.version,
      providerName: config.aiNotice.providerName,
      retentionDays: config.aiNotice.retentionDays,
    },
  };
}
