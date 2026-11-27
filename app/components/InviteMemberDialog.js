"use client";

import { useState } from "react";
import Dialog from "./Dialog";
import { ROLE_LABELS, SPECIALIZATION_LABELS } from "../lib/workspacePermissions";

export default function InviteMemberDialog({ workspaceId, actorRole, onClose, onInvited }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [specialization, setSpecialization] = useState("");
  const [error, setError] = useState("");
  const [invitation, setInvitation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, specialization: specialization || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to create invitation.");
      setInvitation(data);
      onInvited?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create invitation.");
    } finally {
      setBusy(false);
    }
  }

  const inviteLink = invitation
    ? `${typeof window === "undefined" ? "" : window.location.origin}/invite/${invitation.token}`
    : "";

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyMessage("Invitation link copied.");
    } catch {
      setCopyMessage("Unable to copy the link. Select and copy it manually.");
    }
  }

  return (
    <Dialog labelledBy="invite-member-heading" onClose={onClose}>
      <div>
        <p className="section-kicker">TEAM / INVITATION</p>
        <h2 id="invite-member-heading" className="dialog-heading">
          {invitation ? "Invitation ready" : "Invite a teammate"}
        </h2>
        <p className="dialog-description">
          {invitation
            ? "Copy the secure link and share it with the invitee. It expires in seven days and can be used once."
            : "Create a single-use invitation link for this workspace."}
        </p>
      </div>

      {error ? (
        <p role="alert" className="feedback feedback-error dialog-feedback">{error}</p>
      ) : null}

      {invitation ? (
        <div className="invite-result">
          <label className="form-field">
            <span className="field-label">Invitation link</span>
            <input readOnly value={inviteLink} className="form-control" />
          </label>
          <button
            type="button"
            className="button-secondary"
            onClick={copyInviteLink}
          >
            Copy link
          </button>
          {copyMessage ? <p role="status" className="section-description">{copyMessage}</p> : null}
          {invitation.delivered ? (
            <p className="section-description">Invitation delivered by your configured provider.</p>
          ) : (
            <p className="section-description">
              Email delivery is not configured. Share the link directly.
            </p>
          )}
          <div className="form-actions">
            <button type="button" onClick={onClose} className="button-primary">Done</button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form-stack dialog-form">
          <label className="form-field">
            <span className="field-label">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
              className="form-control"
            />
          </label>
          <label className="form-field">
            <span className="field-label">Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="form-control"
            >
              <option value="MEMBER">{ROLE_LABELS.MEMBER}</option>
              <option value="MANAGER">{ROLE_LABELS.MANAGER}</option>
              {actorRole === "ADMIN" ? (
                <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
              ) : null}
            </select>
          </label>
          <label className="form-field">
            <span className="field-label">Specialization (optional)</span>
            <select
              value={specialization}
              onChange={(event) => setSpecialization(event.target.value)}
              className="form-control"
            >
              <option value="">Not specified</option>
              {Object.entries(SPECIALIZATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="button-secondary" disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="button-primary" disabled={busy}>
              {busy ? "Creating..." : "Create invitation"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
