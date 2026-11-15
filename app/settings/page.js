"use client";

import { usePreferences } from "../components/PreferencesProvider";

function ChoiceCard({ name, value, checked, onChange, children }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 accent-blue-600"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-900">
          {children}
        </span>
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const {
    preferences,
    setPreferences,
    isReady,
    storageError,
    resetPreferences,
  } = usePreferences();

  function updatePreference(name, value) {
    setPreferences((current) => ({ ...current, [name]: value }));
  }

  function handleReset() {
    if (window.confirm("Reset all WorkDesk preferences to their defaults?")) {
      resetPreferences();
    }
  }

  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Preferences are saved in this browser only. This is not an account
            profile.
          </p>
        </header>

        {!isReady && (
          <p role="status" className="mb-5 text-sm text-slate-500">
            Loading saved preferences...
          </p>
        )}
        {storageError && (
          <p
            role="alert"
            className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {storageError}
          </p>
        )}

        <div className="density-grid grid gap-5">
          <section className="density-card rounded-xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
            <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a light or dark color theme.
            </p>
            <fieldset disabled={!isReady} className="mt-4">
              <legend className="sr-only">Theme</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  name="theme"
                  value="light"
                  checked={preferences.theme === "light"}
                  onChange={() => updatePreference("theme", "light")}
                >
                  Light theme
                </ChoiceCard>
                <ChoiceCard
                  name="theme"
                  value="dark"
                  checked={preferences.theme === "dark"}
                  onChange={() => updatePreference("theme", "dark")}
                >
                  Dark theme
                </ChoiceCard>
              </div>
            </fieldset>

            <fieldset disabled={!isReady} className="mt-6">
              <legend className="mb-3 text-sm font-medium text-slate-700">
                Display density
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  name="layout"
                  value="comfortable"
                  checked={preferences.layout === "comfortable"}
                  onChange={() => updatePreference("layout", "comfortable")}
                >
                  Comfortable layout
                </ChoiceCard>
                <ChoiceCard
                  name="layout"
                  value="compact"
                  checked={preferences.layout === "compact"}
                  onChange={() => updatePreference("layout", "compact")}
                >
                  Compact layout
                </ChoiceCard>
              </div>
            </fieldset>
          </section>

          <section className="density-card rounded-xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
            <h2 className="text-lg font-semibold text-slate-900">
              Task preferences
            </h2>
            <label className="mt-4 block max-w-sm">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Default priority for new tasks
              </span>
              <select
                value={preferences.defaultPriority}
                disabled={!isReady}
                onChange={(event) =>
                  updatePreference("defaultPriority", event.target.value)
                }
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100 disabled:opacity-60"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
            <label className="mt-5 flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={preferences.confirmDelete}
                disabled={!isReady}
                onChange={(event) =>
                  updatePreference("confirmDelete", event.target.checked)
                }
                className="mt-0.5 size-4 accent-blue-600"
              />
              <span>
                <span className="block font-medium text-slate-900">
                  Confirm before deleting a task
                </span>
                <span className="mt-1 block text-slate-500">
                  Ask for confirmation before removing a task from SQLite.
                </span>
              </span>
            </label>
          </section>

          <section className="density-card rounded-xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
            <h2 className="text-lg font-semibold text-slate-900">Local profile</h2>
            <p className="mt-1 text-sm text-slate-500">
              This display name is stored only in your browser and does not
              create an account.
            </p>
            <label className="mt-4 block max-w-sm">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Display name
              </span>
              <input
                type="text"
                maxLength={40}
                value={preferences.displayName}
                disabled={!isReady}
                onChange={(event) =>
                  updatePreference("displayName", event.target.value)
                }
                onBlur={() =>
                  updatePreference(
                    "displayName",
                    preferences.displayName.trim(),
                  )
                }
                placeholder="e.g. Alex"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-3 focus:ring-blue-100 disabled:opacity-60"
              />
            </label>
          </section>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Changes save automatically in this browser.
          </p>
          <button
            type="button"
            onClick={handleReset}
            disabled={!isReady}
            className="h-10 self-start rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:opacity-60 sm:self-auto"
          >
            Reset preferences
          </button>
        </div>
      </div>
    </div>
  );
}
