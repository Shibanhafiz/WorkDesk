"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import Dialog from "../components/Dialog";
import { useWorkspaces } from "../lib/useWorkspaces";
import { useTasks } from "../lib/useTasks";
import { useSession } from "../components/SessionProvider";
import TeamWorkload from "../components/TeamWorkload";
import InviteMemberDialog from "../components/InviteMemberDialog";
import WorkspaceActivity from "../components/WorkspaceActivity";
import {
  ROLE_LABELS,
  SPECIALIZATION_LABELS,
  SPECIALIZATION_TONES,
} from "../lib/workspacePermissions";

function formatDate(value) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function AddMemberDialog({ workspaceId, onClose, onAdded }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [specialization, setSpecialization] = useState("DEVELOPER");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, specialization }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to add member.");
      setResult(data);
      onAdded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Dialog labelledBy="add-member-heading" onClose={onClose}>
        <div>
          <p className="section-kicker">TEAM / MEMBER ADDED</p>
          <h2 id="add-member-heading" className="dialog-heading">Member added</h2>
          <p className="dialog-description">
            {result.email} was added as {ROLE_LABELS[result.role]}.
          </p>
          {result.temporaryPassword ? (
            <div className="feedback">
              <p className="section-description">
                New account created. Temporary password (share securely):
              </p>
              <p className="details-copy">{result.temporaryPassword}</p>
            </div>
          ) : null}
        </div>
        <div className="form-actions">
          <button type="button" onClick={onClose} className="button-primary">Done</button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog labelledBy="add-member-heading" onClose={onClose}>
      <div>
        <p className="section-kicker">TEAM / ADD MEMBER</p>
        <h2 id="add-member-heading" className="dialog-heading">Add team member</h2>
        <p className="dialog-description">
          Add an existing user or create a new account for them.
        </p>
      </div>
      {error ? (
        <p role="alert" className="feedback feedback-error dialog-feedback">{error}</p>
      ) : null}
      <form onSubmit={handleSubmit} className="form-stack dialog-form">
        <label className="form-field">
          <span className="field-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="form-control"
            placeholder="teammate@example.com"
          />
        </label>
        <label className="form-field">
          <span className="field-label">Workspace role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="form-control">
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span className="field-label">Specialization</span>
          <select
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            className="form-control"
          >
            {Object.entries(SPECIALIZATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <div className="form-actions">
          <button type="button" onClick={onClose} disabled={busy} className="button-secondary">Cancel</button>
          <button type="submit" disabled={busy} className="button-primary">
            {busy ? "Adding..." : "Add member"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function EditMemberDialog({ member, workspaceId, onClose, onUpdated }) {
  const [role, setRole] = useState(member.role);
  const [specialization, setSpecialization] = useState(member.specialization ?? "OTHER");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/members/${member.userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, specialization }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update member.");
      onUpdated?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog labelledBy="edit-member-heading" onClose={onClose}>
      <div>
        <p className="section-kicker">TEAM / EDIT MEMBER</p>
        <h2 id="edit-member-heading" className="dialog-heading">
          {member.name || member.email}
        </h2>
      </div>
      {error ? (
        <p role="alert" className="feedback feedback-error dialog-feedback">{error}</p>
      ) : null}
      <form onSubmit={handleSubmit} className="form-stack dialog-form">
        <label className="form-field">
          <span className="field-label">Workspace role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="form-control">
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span className="field-label">Specialization</span>
          <select
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            className="form-control"
          >
            {Object.entries(SPECIALIZATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <div className="form-actions">
          <button type="button" onClick={onClose} disabled={busy} className="button-secondary">Cancel</button>
          <button type="submit" disabled={busy} className="button-primary">Save changes</button>
        </div>
      </form>
    </Dialog>
  );
}

export default function TeamPage() {
  const { currentWorkspace } = useWorkspaces();
  const { user: sessionUser } = useSession();
  const workspaceId = currentWorkspace?.id ?? null;
  const { tasks, todayDateKey, reloadTasks } = useTasks(workspaceId);
  const canManage = sessionUser?.role === "ADMIN";
  const canInvite = canManage || sessionUser?.role === "MANAGER";

  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const fetchTeamData = useCallback(async () => {
    if (!workspaceId) return null;
    const [membersResponse, invitationsResponse] = await Promise.all([
      fetch(`/api/workspaces/${workspaceId}/members`),
      fetch(`/api/workspaces/${workspaceId}/invitations`),
    ]);
    const membersData = await membersResponse.json().catch(() => ({}));
    if (!membersResponse.ok) {
      throw new Error(membersData.error || "Failed to load members.");
    }
    const invitationsData = invitationsResponse.ok
      ? await invitationsResponse.json().catch(() => [])
      : [];
    return { members: membersData, invitations: invitationsData };
  }, [workspaceId]);

  const applyTeamData = useCallback((data) => {
    if (!data) return;
    setMembers(data.members);
    setInvitations(data.invitations);
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      applyTeamData(await fetchTeamData());
    } catch (err) {
      setError(err.message);
    }
  }, [fetchTeamData, applyTeamData]);

  function invitationStatus(invitation) {
    if (invitation.acceptedAt) return "Accepted";
    if (invitation.rejectedAt) return "Declined";
    if (
      todayDateKey &&
      new Date(invitation.expiresAt).getTime() <=
        new Date(`${todayDateKey}T23:59:59.999Z`).getTime()
    ) {
      return "Expired";
    }
    return "Pending";
  }

  async function handleInvitationAction(invitation, action) {
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/invitations/${invitation.token}${action === "resend" ? "/resend" : ""}`,
        {
          method: action === "revoke" ? "DELETE" : "POST",
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update invitation.");
      setFeedback({
        type: "success",
        message: action === "revoke" ? "Invitation revoked." : "Invitation resent.",
      });
      await loadMembers();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  }

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    fetchTeamData()
      .then((data) => {
        if (active) applyTeamData(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workspaceId, fetchTeamData, applyTeamData]);

  async function removeMember(member) {
    if (!window.confirm(`Remove ${member.name || member.email} from this workspace?`)) return;
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/members/${member.userId}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to remove member.");
      setFeedback({ type: "success", message: "Member removed." });
      loadMembers();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  }

  if (!workspaceId) {
    return (
      <div className="page-frame">
        <PageHeader number="06" title="Team" description="Manage workspace members and invitations." />
        <p className="state-panel">Create or select a workspace to manage your team.</p>
      </div>
    );
  }

  return (
    <div className="page-frame">
      <PageHeader
        number="06"
        title="Team"
        description="Manage workspace members, roles and specializations."
        meta={`${members.length} ${members.length === 1 ? "MEMBER" : "MEMBERS"}`}
        action={
          canInvite || canManage ? (
            <div className="team-header-actions">
              {canInvite ? (
                <button
                  type="button"
                  onClick={() => setShowInviteDialog(true)}
                  className="button-secondary"
                >
                  Invite member
                </button>
              ) : null}
              {canManage ? (
                <button type="button" onClick={() => setShowAddDialog(true)} className="button-primary">
                  <span aria-hidden="true">+</span>
                  Add member
                </button>
              ) : null}
            </div>
          ) : null
        }
      />

      {feedback ? (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`feedback${feedback.type === "error" ? " feedback-error" : ""}`}
        >
          {feedback.message}
        </div>
      ) : null}

      <section aria-labelledby="members-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">01 / MEMBERS</p>
            <h2 id="members-heading" className="section-title">Workspace members</h2>
          </div>
        </div>
        {isLoading ? (
          <p role="status" className="state-panel">Loading team...</p>
        ) : error ? (
          <div className="state-panel">
            <p role="alert" className="state-error">{error}</p>
          </div>
        ) : (
          <div className="project-register">
            {members.map((member) => (
              <article key={member.userId} className="task-register-row">
                <div className="task-record-main">
                  <h3 className="task-summary-title">{member.name || member.email}</h3>
                  <p className="task-description">{member.email}</p>
                  <div className="task-summary-footer">
                    <span className="priority-tag priority-medium">
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                    <span className={`priority-tag ${SPECIALIZATION_TONES[member.specialization] ?? "priority-low"}`}>
                      {SPECIALIZATION_LABELS[member.specialization] ?? member.specialization}
                    </span>
                    <span className="task-summary-date">Joined {formatDate(member.joinedAt)}</span>
                  </div>
                </div>
                {canManage ? (
                  <div className="task-record-actions">
                    <button
                      type="button"
                      onClick={() => setEditingMember(member)}
                      className="record-action"
                    >
                      Edit
                    </button>
                    {member.userId !== sessionUser?.id ? (
                      <button
                        type="button"
                        onClick={() => removeMember(member)}
                        className="record-action record-action-danger"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {workspaceId ? (
        <TeamWorkload
          key={workspaceId}
          workspaceId={workspaceId}
          members={members}
          tasks={tasks}
          todayDateKey={todayDateKey}
          workspaceName={currentWorkspace?.name ?? ""}
          canManage={canManage || sessionUser?.role === "MANAGER"}
          onTasksChanged={reloadTasks}
        />
      ) : null}

      {invitations.length > 0 ? (
        <section aria-labelledby="invitations-heading">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">02 / PENDING INVITATIONS</p>
              <h2 id="invitations-heading" className="section-title">Pending invitations</h2>
            </div>
          </div>
          <div className="project-register">
            {invitations.map((invitation) => (
              <article key={invitation.id} className="task-register-row">
                <div className="task-record-main">
                  <h3 className="task-summary-title">{invitation.email || "Link invitation"}</h3>
                  <div className="task-summary-footer">
                    <span className="priority-tag">
                      {ROLE_LABELS[invitation.role] || invitation.role}
                    </span>
                    <span className="priority-tag priority-medium">
                      {invitationStatus(invitation)}
                    </span>
                    {invitation.specialization ? (
                      <span className="priority-tag">
                        {SPECIALIZATION_LABELS[invitation.specialization] || invitation.specialization}
                      </span>
                    ) : null}
                    <span className="task-summary-date">
                      Expires {formatDate(invitation.expiresAt)}
                    </span>
                  </div>
                </div>
                {canManage ? (
                  <div className="task-record-actions">
                    <button
                      type="button"
                      className="record-action"
                      onClick={() => navigator.clipboard?.writeText(
                        `${window.location.origin}/invite/${invitation.token}`,
                      )}
                    >
                      Copy link
                    </button>
                    {invitationStatus(invitation) !== "Accepted" ? (
                      <button
                        type="button"
                        className="record-action"
                        onClick={() => handleInvitationAction(invitation, "resend")}
                      >
                        Resend
                      </button>
                    ) : null}
                    {invitationStatus(invitation) !== "Accepted" ? (
                      <button
                        type="button"
                        className="record-action record-action-danger"
                        onClick={() => handleInvitationAction(invitation, "revoke")}
                      >
                        Revoke
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <WorkspaceActivity workspaceId={workspaceId} workspaceName={currentWorkspace?.name ?? ""} />

      {showAddDialog ? (
        <AddMemberDialog
          workspaceId={workspaceId}
          onClose={() => setShowAddDialog(false)}
          onAdded={loadMembers}
        />
      ) : null}

      {editingMember ? (
        <EditMemberDialog
          member={editingMember}
          workspaceId={workspaceId}
          onClose={() => setEditingMember(null)}
          onUpdated={loadMembers}
        />
      ) : null}

      {showInviteDialog ? (
        <InviteMemberDialog
          workspaceId={workspaceId}
          actorRole={sessionUser?.role}
          onClose={() => setShowInviteDialog(false)}
          onInvited={loadMembers}
        />
      ) : null}
    </div>
  );
}
