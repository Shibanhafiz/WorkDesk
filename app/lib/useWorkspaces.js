"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "../components/SessionProvider";

async function fetchWorkspaces() {
  const response = await fetch("/api/workspaces", { cache: "no-store" });
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(responseBody?.error || "Unable to load workspaces.");
  }
  if (!Array.isArray(responseBody)) {
    throw new Error("The server returned an invalid workspace list.");
  }

  return responseBody;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unable to load workspaces.";
}

export function useWorkspaces() {
  const { workspaceId: sessionWorkspaceId, setWorkspaceId } = useSession();
  const [workspaces, setWorkspaces] = useState([]);
  const [overrideWorkspaceId, setOverrideWorkspaceId] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectionError, setSelectionError] = useState("");

  const activeWorkspaceId =
    overrideWorkspaceId === undefined ? sessionWorkspaceId : overrideWorkspaceId;
  const currentWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0] ??
    null;

  const reloadWorkspaces = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      setWorkspaces(await fetchWorkspaces());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setCurrentWorkspace = useCallback(
    async (workspace) => {
      const workspaceId = workspace?.id ?? null;
      setOverrideWorkspaceId(workspaceId);
      setSelectionError("");

      if (!workspaceId) {
        return;
      }

      try {
        await setWorkspaceId(workspaceId);
      } catch (switchError) {
        setOverrideWorkspaceId(sessionWorkspaceId ?? null);
        setSelectionError(
          switchError instanceof Error
            ? switchError.message
            : "Unable to switch workspaces.",
        );
      }
    },
    [sessionWorkspaceId, setWorkspaceId],
  );

  useEffect(() => {
    let isMounted = true;

    fetchWorkspaces()
      .then((result) => {
        if (isMounted) setWorkspaces(result);
      })
      .catch((loadError) => {
        if (isMounted) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    isLoading,
    error,
    selectionError,
    reloadWorkspaces,
  };
}
