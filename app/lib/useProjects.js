"use client";

import { useCallback, useEffect, useState } from "react";
import { getTodayDateKey } from "./taskInsights";

export async function fetchProjects() {
  const response = await fetch("/api/projects", { cache: "no-store" });
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

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [todayDateKey, setTodayDateKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const reloadProjects = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const loadedProjects = await fetchProjects();
      setProjects(loadedProjects);
      setTodayDateKey(getTodayDateKey());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchProjects()
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
  }, []);

  return {
    projects,
    setProjects,
    todayDateKey,
    isLoading,
    error,
    reloadProjects,
  };
}
