import type { Metadata } from "next";
import { Archivo, DM_Mono, Schibsted_Grotesk } from "next/font/google";
import { connection } from "next/server";
import { countApplications } from "@/modules/application";
import { getPageSession } from "@/modules/identity";
import { SessionWatch } from "@/modules/identity/ui";
import { getConfig } from "@/shared/server/config";
import { getDb } from "@/shared/server/db";
import { log } from "@/shared/server/log";
import { toRunMode } from "@/shared/server/run-mode";
import { LIVE_REGION_IDS } from "@/shared/ui/announce";
import { AppBar } from "@/shared/ui/components/app-bar";
import { Banner } from "@/shared/ui/components/banner";
import type { AccountNav } from "@/shared/ui/components/nav-items";
import { messages } from "@/shared/ui/messages.nb";
import { QueryProvider } from "@/shared/ui/query-provider";
import { RunModeProvider } from "@/shared/ui/run-mode";
import "./globals.css";

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = { title: messages.siteName };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read the run mode per request, never at build time (AD-4).
  await connection();
  const config = getConfig();
  const runMode = toRunMode(config);
  // With accounts on, the app bar shows the logged-out or the logged-in set
  // (UX-DR5). The lookup is shared with the page that asks for it.
  const session = config.features.accounts ? await getPageSession() : null;
  const account: AccountNav = !config.features.accounts
    ? "off"
    : session === null
      ? "out"
      : "in";

  // Historikk shows how many entries the Student has (Story 6.8). A count that
  // cannot be read costs the app bar its number, not the page.
  let historyCount: number | undefined;
  if (session !== null) {
    try {
      historyCount = await countApplications(session.studentId, await getDb());
    } catch (error) {
      log({
        kind: "error",
        code: "UNEXPECTED",
        errorName: error instanceof Error ? error.name : "Error",
        route: "layout",
      });
    }
  }

  return (
    <html
      lang="nb"
      className={`${schibstedGrotesk.variable} ${dmMono.variable} ${archivo.variable}`}
    >
      <body>
        <RunModeProvider value={runMode}>
          <a
            href="#hovedinnhold"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:inline-flex focus:min-h-control-height focus:items-center focus:border focus:border-ink focus:bg-ink focus:px-5 focus:text-button focus:text-ground"
          >
            {messages.skipLink}
          </a>
          {/* One client for the app bar and the page: the count by Historikk
              and the list share a cache. */}
          <QueryProvider>
            <header>
              <AppBar account={account} historyCount={historyCount} />
              <Banner />
            </header>
            <main
              id="hovedinnhold"
              tabIndex={-1}
              className="flex-1 px-page-x pt-page-top pb-page-bottom max-640:px-page-x-mobile max-640:pt-page-top-mobile max-640:pb-page-bottom-mobile"
            >
              {children}
              {session === null ? null : (
                // The expiry warning and the keep-alive (Story 6.5); a
                // logged-in Student only, so never with accounts off.
                <SessionWatch
                  expiresAt={session.expiresAt.toISOString()}
                  serverNow={Date.now()}
                />
              )}
            </main>
          </QueryProvider>
        </RunModeProvider>
        <div
          id={LIVE_REGION_IDS.phase}
          role="status"
          aria-live="polite"
          className="sr-only"
        />
        <div
          id={LIVE_REGION_IDS.action}
          role="status"
          aria-live="polite"
          className="sr-only"
        />
      </body>
    </html>
  );
}
