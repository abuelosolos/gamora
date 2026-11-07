import type { Metadata } from "next";
import { Geom, Poppins } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { SessionKeepAlive } from "@/components/auth/session-keep-alive";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { clientEnv } from "@/lib/env.client";
import { DEFAULT_THEME, isTheme, THEME_COOKIE } from "@/lib/theme";

// Figma type styles use Poppins everywhere (Regular 400, Medium 500, SemiBold 600).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Geom is used only for the GAMORA wordmark (Figma type/display).
const geom = Geom({
  variable: "--font-geom",
  subsets: ["latin"],
  display: "swap",
});

// metadataBase makes every relative URL in the page tags (like og:url and the
// link-preview image) absolute. On the live Vercel site it is the production
// domain Vercel provides (gamora-xi.vercel.app), so a wrong NEXT_PUBLIC_APP_URL
// can never point previews at the wrong host; elsewhere it is NEXT_PUBLIC_APP_URL.
const productionHost = process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : undefined;
const siteUrl = productionHost ? `https://${productionHost}` : clientEnv.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Gamora", template: "%s | Gamora" },
  description: "A portfolio and freelance platform for artists.",
  openGraph: { siteName: "Gamora", type: "website" },
};

// The theme cookie decides the <html data-theme> attribute, so the root layout
// must read request data before it can render. That cannot be prerendered, so
// this segment is allowed to block (needed for a no-flash, server-applied theme).
export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read the saved theme on the server so the first paint is already themed.
  const cookieStore = await cookies();
  const saved = cookieStore.get(THEME_COOKIE)?.value;
  const theme = isTheme(saved) ? saved : DEFAULT_THEME;

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${poppins.variable} ${geom.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider initialTheme={theme}>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
        <SessionKeepAlive />
      </body>
    </html>
  );
}

