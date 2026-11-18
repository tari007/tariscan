import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "TariScan POS | Smart Retail Management",
  description: "An intelligent, offline-first point of sale and retail management platform for businesses.",
  applicationName: "TariScan POS",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "TariScan POS" },
  icons: { icon: "/icons/tariscan-192.svg", apple: "/icons/tariscan-192.svg" },
  keywords: ["TariScan POS", "Point of Sale", "Retail Management", "Inventory Management", "Offline POS"]
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111a2e"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
