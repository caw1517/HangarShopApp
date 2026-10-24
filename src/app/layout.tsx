import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HangarShopApp",
  description: "Multi-shop aviation maintenance tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
