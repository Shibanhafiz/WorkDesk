"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

async function fetchUnreadCount() {
  try {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    return typeof data?.unreadCount === "number" ? data.unreadCount : null;
  } catch {
    return null;
  }
}

/**
 * Unread notification count for the sidebar badge. Refreshes whenever the
 * route changes so the badge stays current after reading notifications or
 * receiving a new assignment.
 */
export function useUnreadNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const count = await fetchUnreadCount();
    if (count !== null) setUnreadCount(count);
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchUnreadCount().then((count) => {
      if (isMounted && count !== null) setUnreadCount(count);
    });
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  return { unreadCount, refresh };
}
