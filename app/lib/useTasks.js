"use client";

import { useCallback, useEffect, useState } from "react";
import { getTodayDateKey } from "./taskInsights";

async function fetchTasks(workspaceId = null) {
  const url = workspaceId
    ? `/api/tasks?workspaceId=${workspaceId}`
    : "/api/tasks";
  const response = await fetch(url, { cache: "no-store" });
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(responseBody?.error || "Unable to load tasks.");
  }
  if (!Array.isArray(responseBody)) {
    throw new Error("The server returned an invalid task list.");
  }

  return responseBody;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unable to load tasks.";
}

export function useTasks(workspaceId = null) {
  const [tasks, setTasks] = useState([]);
  const [todayDateKey, setTodayDateKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const reloadTasks = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const loadedTasks = await fetchTasks(workspaceId);
      setTasks(loadedTasks);
      setTodayDateKey(getTodayDateKey());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let isMounted = true;

    fetchTasks(workspaceId)
      .then((loadedTasks) => {
        if (isMounted) {
          setTasks(loadedTasks);
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

  return { tasks, todayDateKey, isLoading, error, reloadTasks };
}