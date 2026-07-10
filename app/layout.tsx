import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accountability",
  description: "Show up. Every day.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
