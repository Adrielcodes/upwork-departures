import type { Metadata, Viewport } from "next";
import { B612_Mono, Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

// Barlow echoes airport wayfinding signage; B612 was designed by Airbus for cockpit displays.
const signage = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-signage" });
const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const cockpit = B612_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-cockpit" });

export const metadata: Metadata = {
  title: "Departures — Adriel's Upwork proposals",
  description: "Every Upwork proposal I send, shown as a flight on a split-flap departures board.",
};

export const viewport: Viewport = {
  themeColor: "#0b0c0e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${signage.variable} ${body.variable} ${cockpit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
