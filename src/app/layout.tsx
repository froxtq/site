import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { FONT_FAMILY, THEME } from "@/data/portfolio-data";
import "./globals.css";

export const metadata: Metadata = {
  title: "froxtq site",
  description: "Terminal style portfolio built with Next.js",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={
          {
            "--terminal-font": FONT_FAMILY,
            "--bg": THEME.bg,
            "--text": THEME.text,
            "--muted": THEME.muted,
            "--accent": THEME.accent,
            "--accent-2": THEME.accentSecondary,
            "--border": THEME.border
          } as CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
