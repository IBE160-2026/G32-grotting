import type { Metadata } from "next";
import { Archivo, DM_Mono, Schibsted_Grotesk } from "next/font/google";
import { connection } from "next/server";
import { getConfig } from "@/shared/server/config";
import { toRunMode } from "@/shared/server/run-mode";
import { LIVE_REGION_IDS } from "@/shared/ui/announce";
import { AppBar } from "@/shared/ui/components/app-bar";
import { Banner } from "@/shared/ui/components/banner";
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
          <header>
            <AppBar />
            <Banner />
          </header>
          <main
            id="hovedinnhold"
            tabIndex={-1}
            className="flex-1 px-page-x pt-page-top pb-page-bottom max-640:px-page-x-mobile max-640:pt-page-top-mobile max-640:pb-page-bottom-mobile"
          >
            <QueryProvider>{children}</QueryProvider>
          </main>
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
