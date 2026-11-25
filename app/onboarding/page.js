"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../components/SessionProvider";
import { useWorkspaces } from "../lib/useWorkspaces";

const steps = ["Workspace", "Profile", "Team", "First project"];

function isValidDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, reload } = useSession();
  const { currentWorkspace, reloadWorkspaces } = useWorkspaces();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [profile, setProfile] = useState({
    displayName: "",
    avatarUrl: "",
    specialization: "",
  });
  const [invitations, setInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/onboarding", { cache: "no-store" })
      .then((response) => response.json().catch(() => ({}))
        .then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!active) return;
        if (!ok) {
          setError(result.error || "Unable to load onboarding progress.");
          return;
        }
        if (result.completed) {
          router.replace("/");
          return;
        }
        setStep(result.step ?? 0);
        setData(result.data ?? {});
        setProfile({
          displayName: result.profile?.displayName ?? "",
          avatarUrl: result.profile?.avatarUrl ?? "",
          specialization: result.profile?.specialization ?? "",
        });
      })
      .catch(() => {
        if (active) setError("Unable to load onboarding progress.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (step !== 2 || !currentWorkspace?.id) return;
    let active = true;

    fetch(`/api/workspaces/${currentWorkspace.id}/invitations`, { cache: "no-store" })
      .then((response) => response.json().catch(() => []))
      .then((list) => {
        if (active && Array.isArray(list)) setInvitations(list);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [step, currentWorkspace?.id]);

  const updateData = useCallback((patch) => {
    setData((current) => ({ ...current, ...patch }));
  }, []);

  async function apiRequest(url, options) {
    const response = await fetch(url, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || "Something went wrong. Please try again.");
    }
    return body;
  }

  async function saveProgress(nextStep = step, overrides = {}) {
    const saved = await apiRequest("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: nextStep, data: { ...data, ...overrides } }),
    });
    setData(saved.data ?? {});
    setStep(saved.step ?? nextStep);
    setSavedAt(new Date());
    return saved;
  }

  async function finishOnboarding(overrides = {}) {
    await apiRequest("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true, data: { ...data, ...overrides } }),
    });
    await reload();
    setCompleted(true);
  }

  async function handleContinue() {
    setError("");
    setIsBusy(true);

    try {
      if (step === 0) {
        const choice = data.workspaceChoice || "personal";
        const payload = { choice };
        if (choice === "team") {
          if (!data.teamName?.trim()) {
            throw new Error("Enter a name for your team workspace.");
          }
          payload.name = data.teamName;
          payload.description = data.workspaceDescription;
        }
        if (choice === "join") {
          if (!data.inviteToken?.trim()) {
            throw new Error("Enter the invitation token from your invite link.");
          }
          payload.token = data.inviteToken;
        }

        const workspace = await apiRequest("/api/onboarding/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await Promise.all([reload(), reloadWorkspaces()]);
        await saveProgress(1, {
          workspaceChoice: choice,
          teamName: choice === "team" ? data.teamName : "",
          inviteToken: "",
        });
        updateData({ activeWorkspaceId: workspace.workspaceId });
        return;
      }

      if (step === 1) {
        if (profile.displayName && profile.displayName.trim().length < 2) {
          throw new Error("Display name must be at least 2 characters.");
        }
        await apiRequest("/api/auth/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });

        if (currentWorkspace?.id && user?.role === "ADMIN") {
          const workspaceName = (data.workspaceName || currentWorkspace.name || "").trim();
          if (!workspaceName) throw new Error("Workspace name is required.");
          await apiRequest(`/api/workspaces/${currentWorkspace.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: workspaceName,
              description: data.workspaceDescription || "",
            }),
          });
          await reloadWorkspaces();
        }
        await reload();
        await saveProgress(2, {
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          specialization: profile.specialization,
          workspaceName: data.workspaceName || currentWorkspace?.name || "",
          workspaceDescription: data.workspaceDescription || "",
        });
        return;
      }

      if (step === 2) {
        await saveProgress(3);
        return;
      }

      const project = data.firstProject ?? {};
      if (!project.name?.trim()) {
        throw new Error("Enter a name for your first project.");
      }
      if (!isValidDate(project.startDate) || !isValidDate(project.dueDate)) {
        throw new Error("Enter valid project dates.");
      }
      if (project.startDate && project.dueDate && project.startDate > project.dueDate) {
        throw new Error("Due date must be on or after the start date.");
      }
      if (!currentWorkspace?.id) {
        throw new Error("Choose a workspace before creating a project.");
      }

      const workspaceId = encodeURIComponent(currentWorkspace.id);
      const createdProject = await apiRequest(`/api/projects?workspaceId=${workspaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          description: project.description || null,
          status: "PLANNING",
          startDate: project.startDate || null,
          dueDate: project.dueDate || null,
        }),
      });

      if (project.initialTaskTitle?.trim()) {
        await apiRequest(`/api/tasks?workspaceId=${workspaceId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: project.initialTaskTitle.trim(),
            projectId: createdProject.id,
          }),
        });
      }

      await finishOnboarding({ firstProject: project });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleBack() {
    if (step === 0) return;
    setError("");
    setIsBusy(true);
    try {
      await saveProgress(step - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save progress.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSkip() {
    setError("");
    setIsBusy(true);
    try {
      if (step === 3) {
        await finishOnboarding({ skipped: { ...(data.skipped ?? {}), firstProject: true } });
        return;
      }
      const skippedKey = step === 1 ? "profile" : "invitations";
      await saveProgress(step + 1, {
        skipped: { ...(data.skipped ?? {}), [skippedKey]: true },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save progress.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSave() {
    setError("");
    setIsBusy(true);
    try {
      await saveProgress(step);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save progress.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleInvite(event) {
    event.preventDefault();
    setError("");
    if (!inviteEmail.trim()) return;
    setIsBusy(true);
    try {
      const created = await apiRequest(
        `/api/workspaces/${currentWorkspace.id}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
        },
      );
      setInvitations((current) => [created, ...current]);
      setInviteEmail("");
      await saveProgress(step, {
        invitationEmails: [...(data.invitationEmails ?? []), created.email].filter(Boolean),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create invitation.");
    } finally {
      setIsBusy(false);
    }
  }

  async function copyInviteLink(token) {
    const link = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setSavedAt(new Date());
    } catch {
      setError("Copy failed. Select the link and copy it manually.");
    }
  }

  if (isLoading) {
    return (
      <div className="page-frame">
        <p role="status" className="state-panel">
          Loading your setup...
        </p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="page-frame">
        <section className="onboarding-complete">
          <p className="section-kicker">ALL SET</p>
          <h1 className="page-title">Your workspace is ready</h1>
          <p className="section-description">
            You can now start organizing projects and tasks in {currentWorkspace?.name ?? "your workspace"}.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="button-primary onboarding-complete-action"
          >
            Go to dashboard
          </button>
        </section>
      </div>
    );
  }

  const project = data.firstProject ?? {};

  return (
    <div className="page-frame">
      <div className="onboarding-shell">
        <header className="onboarding-header">
          <p className="section-kicker">GETTING STARTED</p>
          <h1 className="page-title">Set up your workspace</h1>
          <p className="section-description">
            Four short steps to get WorkDesk ready for your team.
          </p>
        </header>

        <ol className="onboarding-progress" aria-label="Onboarding progress">
          {steps.map((label, index) => (
            <li
              key={label}
              className={`onboarding-step-marker${index === step ? " is-current" : ""}${index < step ? " is-done" : ""}`}
              aria-current={index === step ? "step" : undefined}
            >
              <span aria-hidden="true">{index < step ? "✓" : String(index + 1).padStart(2, "0")}</span>
              {label}
            </li>
          ))}
        </ol>

        {error ? (
          <p role="alert" className="feedback feedback-error onboarding-feedback">
            {error}
          </p>
        ) : null}

        <div className="onboarding-card">
          {step === 0 ? (
            <section aria-labelledby="workspace-choice-heading">
              <h2 id="workspace-choice-heading" className="section-title">
                How would you like to start?
              </h2>
              <div className="onboarding-choice-grid">
                {[
                  {
                    value: "personal",
                    title: "Personal workspace",
                    copy: "A private space for your own projects and tasks.",
                  },
                  {
                    value: "team",
                    title: "Create a team workspace",
                    copy: "Invite teammates and share projects with your team.",
                  },
                  {
                    value: "join",
                    title: "Join an existing team",
                    copy: "Use a valid invitation link from a workspace admin.",
                  },
                ].map((option) => (
                  <label key={option.value} className="onboarding-choice">
                    <input
                      type="radio"
                      name="workspaceChoice"
                      value={option.value}
                      checked={(data.workspaceChoice || "personal") === option.value}
                      onChange={() => updateData({ workspaceChoice: option.value })}
                    />
                    <span>
                      <strong>{option.title}</strong>
                      <span className="onboarding-choice-copy">{option.copy}</span>
                    </span>
                  </label>
                ))}
              </div>

              {data.workspaceChoice === "team" ? (
                <div className="onboarding-fields">
                  <label className="form-field">
                    <span className="field-label">Workspace name</span>
                    <input
                      className="form-control"
                      value={data.teamName ?? ""}
                      maxLength={80}
                      onChange={(event) => updateData({ teamName: event.target.value })}
                      placeholder="e.g. Product team"
                    />
                  </label>
                  <label className="form-field">
                    <span className="field-label">Description (optional)</span>
                    <input
                      className="form-control"
                      value={data.workspaceDescription ?? ""}
                      maxLength={500}
                      onChange={(event) => updateData({ workspaceDescription: event.target.value })}
                      placeholder="What is this workspace for?"
                    />
                  </label>
                </div>
              ) : null}

              {data.workspaceChoice === "join" ? (
                <div className="onboarding-fields">
                  <label className="form-field">
                    <span className="field-label">Invitation token</span>
                    <input
                      className="form-control"
                      value={data.inviteToken ?? ""}
                      onChange={(event) => updateData({ inviteToken: event.target.value.trim() })}
                      placeholder="Paste the token from your invite link"
                    />
                  </label>
                  <p className="section-description">
                    Tokens are validated, expire after seven days, and cannot be reused.
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          {step === 1 ? (
            <section aria-labelledby="profile-heading">
              <h2 id="profile-heading" className="section-title">
                Tell us about you
              </h2>
              <div className="onboarding-fields">
                <label className="form-field">
                  <span className="field-label">Display name</span>
                  <input
                    className="form-control"
                    value={profile.displayName}
                    maxLength={80}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, displayName: event.target.value }))
                    }
                    placeholder="Your name"
                  />
                </label>
                <label className="form-field">
                  <span className="field-label">Profile image URL (optional)</span>
                  <input
                    className="form-control"
                    type="url"
                    value={profile.avatarUrl}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, avatarUrl: event.target.value }))
                    }
                    placeholder="https://example.com/avatar.png"
                  />
                </label>
                <label className="form-field">
                  <span className="field-label">Specialization (optional)</span>
                  <select
                    className="form-control"
                    value={profile.specialization || ""}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, specialization: event.target.value }))
                    }
                  >
                    <option value="">Not specified</option>
                    <option value="DEVELOPER">Developer</option>
                    <option value="DESIGNER">Designer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
                <label className="form-field">
                  <span className="field-label">Workspace name</span>
                  <input
                    className="form-control"
                    value={data.workspaceName || currentWorkspace?.name || ""}
                    maxLength={80}
                    disabled={user?.role !== "ADMIN"}
                    onChange={(event) => updateData({ workspaceName: event.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span className="field-label">Workspace description (optional)</span>
                  <input
                    className="form-control"
                    value={data.workspaceDescription ?? ""}
                    maxLength={500}
                    disabled={user?.role !== "ADMIN"}
                    onChange={(event) => updateData({ workspaceDescription: event.target.value })}
                  />
                </label>
                {user?.role !== "ADMIN" ? (
                  <p className="section-description">
                    Only workspace admins can change workspace details.
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section aria-labelledby="invite-heading">
              <h2 id="invite-heading" className="section-title">
                Bring your team in
              </h2>
              {user?.role === "ADMIN" ? (
                <>
                  <form onSubmit={handleInvite} className="onboarding-invite-form">
                    <label className="form-field">
                      <span className="field-label">Teammate email</span>
                      <input
                        className="form-control"
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="teammate@example.com"
                      />
                    </label>
                    <label className="form-field">
                      <span className="field-label">Role</span>
                      <select
                        className="form-control"
                        value={inviteRole}
                        onChange={(event) => setInviteRole(event.target.value)}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </label>
                    <button type="submit" disabled={isBusy} className="button-secondary">
                      Create invite link
                    </button>
                  </form>
                  <p className="section-description">
                    Email delivery is not configured. Copy the secure link and share it yourself.
                    Links expire after seven days and can be used once.
                  </p>
                  {invitations.length > 0 ? (
                    <ul className="onboarding-invite-list">
                      {invitations.map((invitation) => (
                        <li key={invitation.id} className="onboarding-invite-row">
                          <span>
                            {invitation.email || "Anyone with the link"} · {invitation.role}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyInviteLink(invitation.token)}
                            className="text-link-button"
                          >
                            Copy link
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="section-description">No pending invitations yet.</p>
                  )}
                </>
              ) : (
                <p className="section-description">
                  Only workspace admins can invite teammates. You can skip this step.
                </p>
              )}
            </section>
          ) : null}

          {step === 3 ? (
            <section aria-labelledby="project-heading">
              <h2 id="project-heading" className="section-title">
                Create your first project
              </h2>
              <div className="onboarding-fields">
                <label className="form-field">
                  <span className="field-label">Project name</span>
                  <input
                    className="form-control"
                    value={project.name ?? ""}
                    maxLength={100}
                    onChange={(event) =>
                      updateData({ firstProject: { ...project, name: event.target.value } })
                    }
                    placeholder="e.g. Website redesign"
                  />
                </label>
                <label className="form-field">
                  <span className="field-label">Description (optional)</span>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={project.description ?? ""}
                    maxLength={1000}
                    onChange={(event) =>
                      updateData({ firstProject: { ...project, description: event.target.value } })
                    }
                    placeholder="What is this project working toward?"
                  />
                </label>
                <div className="form-grid">
                  <label className="form-field">
                    <span className="field-label">Start date</span>
                    <input
                      className="form-control"
                      type="date"
                      value={project.startDate ?? ""}
                      onChange={(event) =>
                        updateData({ firstProject: { ...project, startDate: event.target.value } })
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span className="field-label">Due date</span>
                    <input
                      className="form-control"
                      type="date"
                      value={project.dueDate ?? ""}
                      onChange={(event) =>
                        updateData({ firstProject: { ...project, dueDate: event.target.value } })
                      }
                    />
                  </label>
                </div>
                <label className="form-field">
                  <span className="field-label">First task (optional)</span>
                  <input
                    className="form-control"
                    value={project.initialTaskTitle ?? ""}
                    maxLength={100}
                    onChange={(event) =>
                      updateData({ firstProject: { ...project, initialTaskTitle: event.target.value } })
                    }
                    placeholder="e.g. Collect requirements"
                  />
                </label>
                <p className="section-description">
                  This project will belong to {currentWorkspace?.name ?? "your active workspace"}.
                </p>
              </div>
            </section>
          ) : null}
        </div>

        <footer className="onboarding-actions">
          <button
            type="button"
            onClick={handleBack}
            disabled={isBusy || step === 0}
            className="button-secondary"
          >
            Back
          </button>
          <div className="onboarding-actions-right">
            <button
              type="button"
              onClick={handleSave}
              disabled={isBusy}
              className="button-quiet"
              aria-live="polite"
            >
              {savedAt ? "Progress saved" : "Save progress"}
            </button>
            {step > 0 ? (
              <button
                type="button"
                onClick={handleSkip}
                disabled={isBusy}
                className="button-quiet"
              >
                Skip for now
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleContinue}
              disabled={isBusy}
              className="button-primary"
            >
              {isBusy
                ? "Saving..."
                : step === 3
                  ? "Finish setup"
                  : "Continue"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
