import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accountability App",
  description: "Track your goals and stay accountable.",
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
