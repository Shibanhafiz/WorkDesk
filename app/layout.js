import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { PreferencesProvider } from "./components/PreferencesProvider";
import { SessionProvider } from "./components/SessionProvider";
import AuthGate from "./components/AuthGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "WorkDesk | Task management",
  description: "A simple workspace for organizing and tracking your tasks.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SessionProvider>
          <PreferencesProvider>
            <Suspense fallback={<p className="state-panel">Loading...</p>}>
              <AuthGate>{children}</AuthGate>
            </Suspense>
          </PreferencesProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
