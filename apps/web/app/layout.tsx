import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "@/components/app/providers";
import "./globals.css";

const satoshi = localFont({
  src: [
    { path: "./fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const serifAccent = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-serif-accent",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Rhea Strip", template: "%s | Rhea Strip" },
  description:
    "Split a liquid-staked NEAR token into principal and yield, then sell future yield before it is earned. Hackathon MVP on NEAR testnet with a mock yield source and a demo clock.",
  applicationName: "Rhea Strip",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${satoshi.variable} ${inter.variable} ${serifAccent.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
