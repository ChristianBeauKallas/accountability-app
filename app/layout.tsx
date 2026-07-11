import type { Metadata, Viewport } from "next";
import "./globals.css";
import SwRegister from "./sw-register";
import InstallPrompt from "./install-prompt";
import BottomNav from "./nav";

export const metadata: Metadata = {
  applicationName: "Accountability",
  title: "Accountability",
  description: "Show up. Every day.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Accountable",
  },
  icons: {
    icon: "/favicon-32.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#07090c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <BottomNav />
        <InstallPrompt />
        <SwRegister />
      </body>
    </html>
  );
}
