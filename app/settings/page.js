"use client";

import PageHeader from "../components/PageHeader";
import { usePreferences } from "../components/PreferencesProvider";

function ChoiceCard({ name, value, checked, onChange, children }) {
  return (
    <label className="choice-card">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <span className="choice-title">{children}</span>
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
    <div className="page-frame">
      <PageHeader
        number="06"
        eyebrow="PREFERENCES"
        title="Settings"
        description="Shape how WorkDesk looks and how new tasks are prepared."
        meta="SAVED IN THIS BROWSER · NOT AN ACCOUNT PROFILE"
      />

      {!isReady ? (
        <p role="status" className="state-panel">
          Loading saved preferences...
        </p>
      ) : null}
      {storageError ? (
        <p role="alert" className="feedback feedback-error">
          {storageError}
        </p>
      ) : null}

      <div className="settings-list">
        <section className="settings-section" aria-labelledby="appearance-heading">
          <div>
            <h2 id="appearance-heading" className="settings-section-title">
              Appearance
            </h2>
            <p className="settings-section-description">
              Set the theme and spacing used throughout the workspace.
            </p>
          </div>
          <div className="settings-controls">
            <fieldset disabled={!isReady}>
              <legend className="field-label">Theme</legend>
              <div className="choice-grid">
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
            <fieldset disabled={!isReady}>
              <legend className="field-label">Display density</legend>
              <div className="choice-grid">
                <ChoiceCard
                  name="layout"
                  value="comfortable"
                  checked={preferences.layout === "comfortable"}
                  onChange={() => updatePreference("layout", "comfortable")}
                >
                  Comfortable
                </ChoiceCard>
                <ChoiceCard
                  name="layout"
                  value="compact"
                  checked={preferences.layout === "compact"}
                  onChange={() => updatePreference("layout", "compact")}
                >
                  Compact
                </ChoiceCard>
              </div>
            </fieldset>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="task-preferences-heading">
          <div>
            <h2
              id="task-preferences-heading"
              className="settings-section-title"
            >
              Task preferences
            </h2>
            <p className="settings-section-description">
              Defaults for task creation and removal.
            </p>
          </div>
          <div className="settings-controls">
            <label className="form-field">
              <span className="field-label">Default task priority</span>
              <select
                value={preferences.defaultPriority}
                disabled={!isReady}
                onChange={(event) =>
                  updatePreference("defaultPriority", event.target.value)
                }
                className="form-control"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={preferences.confirmDelete}
                disabled={!isReady}
                onChange={(event) =>
                  updatePreference("confirmDelete", event.target.checked)
                }
                className="checkbox-control"
              />
              <span>
                <span className="choice-title">
                  Confirm before deleting a task
                </span>
                <span className="settings-section-description">
                  Ask before permanently removing a task from the local database.
                </span>
              </span>
            </label>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="profile-heading">
          <div>
            <h2 id="profile-heading" className="settings-section-title">
              Local profile
            </h2>
            <p className="settings-section-description">
              A display name shown in the workspace. It does not create an
              account.
            </p>
          </div>
          <div className="settings-controls">
            <label className="form-field">
              <span className="field-label">Display name</span>
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
                className="form-control"
              />
            </label>
          </div>
        </section>
      </div>

      <div className="settings-actions">
        <p className="settings-note">
          Changes save automatically in this browser.
        </p>
        <button
          type="button"
          onClick={handleReset}
          disabled={!isReady}
          className="button-secondary"
        >
          Reset preferences
        </button>
      </div>
    </div>
  );
}
