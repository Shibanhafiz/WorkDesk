"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "../../components/SessionProvider";

const roleLabels = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  MEMBER: "Member",
};

function InviteContent() {
  const { token } = useParams();
  const { user: sessionUser, reload } = useSession();
  const [invitation, setInvitation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionState, setActionState] = useState(null);
  const [actionError, setActionError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInvitation() {
      if (!token) return;

      try {
        const response = await fetch(`/api/invitations/${token}`);
        const data = await response.json();

        if (!isMounted) return;

        if (!response.ok) {
          throw new Error(data.error || "Failed to load invitation.");
        }

        setInvitation(data);
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInvitation();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function acceptInvitation() {
    setIsProcessing(true);
    setActionError("");

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invitation.");
      }

      await reload();
      setActionState("accepted");
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function rejectInvitation() {
    setIsProcessing(true);
    setActionError("");

    try {
      const response = await fetch("/api/invitations/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reject invitation.");
      }

      setActionState("rejected");
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-frame">
        <p role="status" className="state-panel">
          Loading invitation...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-frame">
        <div className="state-panel">
          <p role="alert" className="state-error">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (actionState === "accepted") {
    return (
      <div className="page-frame">
        <div className="state-panel">
          <h1 className="section-title">Invitation accepted</h1>
          <p className="section-description">
            You&apos;ve been added to {invitation?.workspace?.name}. You can
            now access this workspace.
          </p>
          <Link href="/" className="button-primary">
            Go to WorkDesk
          </Link>
        </div>
      </div>
    );
  }

  if (actionState === "rejected") {
    return (
      <div className="page-frame">
        <div className="state-panel">
          <h1 className="section-title">Invitation declined</h1>
          <p className="section-description">
            You&apos;ve declined the invitation to join{" "}
            {invitation?.workspace?.name}.
          </p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="page-frame">
        <div className="state-panel">
          <p role="alert" className="state-error">
            Invitation not found.
          </p>
        </div>
      </div>
    );
  }

  if (!invitation.valid) {
    const message = invitation.expired
      ? "This invitation has expired."
      : invitation.used
        ? "This invitation has already been used."
        : invitation.declined
          ? "This invitation has been declined."
          : "This invitation is no longer valid.";

    return (
      <div className="page-frame">
        <div className="state-panel">
          <h1 className="section-title">Invalid invitation</h1>
          <p className="section-description">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-frame">
      <div className="state-panel">
        <p className="section-kicker">WORKSPACE INVITATION</p>
        <h1 className="section-title">
          Join {invitation.workspace.name}
        </h1>
        <p className="section-description">
          You&apos;ve been invited to join{" "}
          <strong>{invitation.workspace.name}</strong> as a{" "}
          <strong>{roleLabels[invitation.role] || invitation.role}</strong>.
        </p>
        {invitation.workspace.description && (
          <p className="section-description">
            {invitation.workspace.description}
          </p>
        )}

        {actionError ? (
          <p role="alert" className="feedback feedback-error">
            {actionError}
          </p>
        ) : null}

        <div className="form-actions">
          <button
            type="button"
            onClick={acceptInvitation}
            disabled={isProcessing}
            className="button-primary"
          >
            {isProcessing ? "Accepting..." : "Accept invitation"}
          </button>
          <button
            type="button"
            onClick={rejectInvitation}
            disabled={isProcessing}
            className="button-secondary"
          >
            {isProcessing ? "Declining..." : "Decline"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="page-frame">
          <p role="status" className="state-panel">
            Loading invitation...
          </p>
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}