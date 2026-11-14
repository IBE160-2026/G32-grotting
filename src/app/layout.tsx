import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobAssistant",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}
