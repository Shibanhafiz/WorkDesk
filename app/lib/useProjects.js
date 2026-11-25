"use client";

import { useCallback, useEffect, useState } from "react";
import { getTodayDateKey } from "./taskInsights";

export async function fetchProjects(workspaceId = null) {
  const url = workspaceId
    ? `/api/projects?workspaceId=${workspaceId}`
    : "/api/projects";
  const response = await fetch(url, { cache: "no-store" });
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(responseBody?.error || "Unable to load projects.");
  }
  if (!Array.isArray(responseBody)) {
    throw new Error("The server returned an invalid project list.");
  }

  return responseBody;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unable to load projects.";
}

export function useProjects(workspaceId = null) {
  const [projects, setProjects] = useState([]);
  const [todayDateKey, setTodayDateKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const reloadProjects = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const loadedProjects = await fetchProjects(workspaceId);
      setProjects(loadedProjects);
      setTodayDateKey(getTodayDateKey());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let isMounted = true;

    fetchProjects(workspaceId)
      .then((loadedProjects) => {
        if (isMounted) {
          setProjects(loadedProjects);
          setTodayDateKey(getTodayDateKey());
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(getErrorMessage(loadError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  return {
    projects,
    setProjects,
    todayDateKey,
    isLoading,
    error,
    reloadProjects,
  };
}