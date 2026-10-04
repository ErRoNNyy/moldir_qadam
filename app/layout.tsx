import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { SetupScreen } from "@/components/setup-screen";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MOLDIR QADAM",
  description:
    "MOLDIR QADAM - MOLDIR ADAM",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="h-full bg-canvas text-ink" suppressHydrationWarning>
        {isSupabaseConfigured ? (
          <AppProvider>
            <AppShell>{children}</AppShell>
          </AppProvider>
        ) : (
          <SetupScreen />
        )}
      </body>
    </html>
  );
}
