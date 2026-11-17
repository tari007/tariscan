import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TariScan POS | Smart Retail Management",
  description:
    "An intelligent, offline-first point of sale and retail management platform for businesses.",
  applicationName: "TariScan POS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TariScan POS"
  },
  keywords: [
    "TariScan POS",
    "Point of Sale",
    "Retail Management",
    "Inventory Management",
    "Offline POS"
  ]
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111a2e"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
