"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { installCsrfFetch } from "../lib/csrf";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workspaceId, setWorkspaceIdState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      setUser(data.user ?? null);
      setWorkspaceIdState(data.workspaceId ?? null);
      return data;
    } catch {
      setUser(null);
      setWorkspaceIdState(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    installCsrfFetch();
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setUser(data.user ?? null);
        setWorkspaceIdState(data.workspaceId ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const setWorkspaceId = useCallback(async (nextWorkspaceId) => {
    const response = await fetch("/api/auth/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: nextWorkspaceId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Unable to switch workspaces.");
    }
    setWorkspaceIdState(data.workspaceId ?? nextWorkspaceId);
    await reload();
  }, [reload]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setWorkspaceIdState(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{ user, workspaceId, isLoading, reload, setWorkspaceId, logout }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
