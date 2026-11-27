"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "./SessionProvider";
import Sidebar from "./Sidebar";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export default function AuthGate({ children }) {
  const { user, isLoading } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/invite/");
  const isOnboarding = pathname === "/onboarding";

  useEffect(() => {
    if (isLoading) return;
    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }
    if (user && !user.onboardingCompleted && !isOnboarding && !isPublic) {
      router.replace("/onboarding");
      return;
    }
    if (user && user.onboardingCompleted && isOnboarding) {
      router.replace("/");
    }
  }, [isLoading, user, isPublic, isOnboarding, router]);

  if (isPublic) {
    return <main className="workspace-main">{children}</main>;
  }

  if (isLoading || !user) {
    return (
      <main className="workspace-main">
        <div className="page-frame">
          <p role="status" className="state-panel">
            Loading your workspace...
          </p>
        </div>
        <div hidden>{children}</div>
      </main>
    );
  }

  return (
    <div className="workspace-layout">
      <Sidebar />
      <main className="workspace-main">{children}</main>
    </div>
  );
}
