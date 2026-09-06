import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Coach Hayes Hudl — Football Coaching Analysis",
    template: "%s · Coach Hayes Hudl",
  },
  description:
    "X's & O's from a coach's perspective. Player breakdowns, recruit evaluations, and weekly college football film breakdowns.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "Coach Hayes Hudl",
    description:
      "X's & O's from a coach's perspective. Player breakdowns, recruit evaluations, and weekly college football film breakdowns.",
    siteName: "Coach Hayes Hudl",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
