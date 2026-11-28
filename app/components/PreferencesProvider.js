"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "workdesk-preferences";

export const DEFAULT_PREFERENCES = {
  theme: "light",
  layout: "comfortable",
  defaultPriority: "Medium",
  confirmDelete: true,
  displayName: "",
};

const serverSnapshot = {
  preferences: DEFAULT_PREFERENCES,
  isReady: false,
  storageError: "",
};

const PreferencesContext = createContext(null);
const listeners = new Set();
let currentSnapshot = serverSnapshot;
let hasLoadedStorage = false;
let hydrated = false;

function normalizePreferences(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_PREFERENCES;
  }

  return {
    theme: value.theme === "dark" ? "dark" : "light",
    layout: value.layout === "compact" ? "compact" : "comfortable",
    defaultPriority: ["Low", "Medium", "High"].includes(value.defaultPriority)
      ? value.defaultPriority
      : DEFAULT_PREFERENCES.defaultPriority,
    confirmDelete:
      typeof value.confirmDelete === "boolean"
        ? value.confirmDelete
        : DEFAULT_PREFERENCES.confirmDelete,
    displayName:
      typeof value.displayName === "string"
        ? value.displayName.trim().slice(0, 40)
        : DEFAULT_PREFERENCES.displayName,
  };
}

function publishSnapshot(snapshot) {
  currentSnapshot = snapshot;
  listeners.forEach((listener) => listener());
}

function loadPreferencesFromStorage() {
  if (hasLoadedStorage) {
    return;
  }

  let preferences = DEFAULT_PREFERENCES;
  let storageError = "";

  try {
    const savedValue = localStorage.getItem(STORAGE_KEY);
    if (savedValue) {
      preferences = normalizePreferences(JSON.parse(savedValue));
    }
  } catch {
    storageError =
      "Browser storage is unavailable. Preferences may not persist.";
  }

  hasLoadedStorage = true;
  publishSnapshot({ preferences, isReady: true, storageError });
}

function handleStorageChange(event) {
  if (event.key !== STORAGE_KEY && event.key !== null) {
    return;
  }

  let preferences = DEFAULT_PREFERENCES;
  let storageError = "";

  try {
    if (event.newValue) {
      preferences = normalizePreferences(JSON.parse(event.newValue));
    }
  } catch {
    storageError =
      "Browser storage could not be read. Preferences may not persist.";
  }

  hasLoadedStorage = true;
  publishSnapshot({ preferences, isReady: true, storageError });
}

function subscribe(listener) {
  listeners.add(listener);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorageChange);
  };
}

function getSnapshot() {
  return hydrated ? currentSnapshot : serverSnapshot;
}

function getServerSnapshot() {
  return serverSnapshot;
}

function savePreferences(preferences) {
  let storageError = "";

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    storageError =
      "Browser storage is unavailable. Preferences may not persist.";
  }

  publishSnapshot({ preferences, isReady: true, storageError });
}

export function PreferencesProvider({ children }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setPreferences = useCallback((update) => {
    const nextPreferences = normalizePreferences(
      typeof update === "function" ? update(currentSnapshot.preferences) : update,
    );
    savePreferences(nextPreferences);
  }, []);

  const resetPreferences = useCallback(() => {
    savePreferences(DEFAULT_PREFERENCES);
  }, []);

  useEffect(() => {
    hydrated = true;
    loadPreferencesFromStorage();
    publishSnapshot(currentSnapshot);
  }, []);

  useEffect(() => {
    if (snapshot.isReady) {
      document.documentElement.dataset.theme = snapshot.preferences.theme;
      document.documentElement.dataset.layout = snapshot.preferences.layout;
    }
  }, [snapshot]);

  return (
    <PreferencesContext.Provider
      value={{
        preferences: snapshot.preferences,
        setPreferences,
        isReady: snapshot.isReady,
        storageError: snapshot.storageError,
        resetPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider.");
  }
  return context;
}
