import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { PreferencesProvider } from "./components/PreferencesProvider";

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
        <PreferencesProvider>
          <div className="workspace-layout">
            <Sidebar />
            <main className="workspace-main">{children}</main>
          </div>
        </PreferencesProvider>
      </body>
    </html>
  );
}
