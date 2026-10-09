import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Athletx",
  title: "Athletx — find your spot",
  description:
    "Coaches post the spots they're recruiting for. Players see where they line up and show their interest — and always hear back.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Athletx",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F1210",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeInit = `(function(){try{var t=localStorage.getItem('athletx-theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Marketing routes (e.g. /coaches) render full-width; the app itself stays
  // inside the mobile-first 480px frame.
  const pathname = headers().get("x-pathname") ?? "";
  // Full-width marketing: the public sales page (root + /coaches). The app and
  // the /qa testing flow stay inside the mobile-first 480px frame.
  const fullWidth =
    pathname === "/" ||
    pathname.startsWith("/coaches") ||
    pathname.startsWith("/players");

  return (
    <html
      lang="en"
      className={`${barlow.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        {fullWidth ? children : <div className="app-frame">{children}</div>}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
