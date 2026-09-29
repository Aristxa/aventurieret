import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aventurieret — your trip, planned like a local",
  description: "Tell Aventurieret how long you're staying and what you love. Get a day-by-day plan with hidden gems, logistics and bookings.",
  openGraph: {
    title: "Aventurieret — your trip, planned like a local",
    description: "A day-by-day plan with hidden gems, realistic timing, and your TikTok saves on the map.",
    siteName: "Aventurieret",
    type: "website",
  },
  appleWebApp: { title: "Aventurieret", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
