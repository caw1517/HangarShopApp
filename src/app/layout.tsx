import type { Metadata } from "next";
import { Public_Sans, Roboto_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font (SIL OFL 1.1). See DESIGN.md §2.
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-public-sans",
  display: "swap",
});
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HangarShopApp",
  description: "Multi-shop aviation maintenance tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${publicSans.variable} ${robotoMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
