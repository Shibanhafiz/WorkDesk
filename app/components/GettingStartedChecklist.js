"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "./SessionProvider";

export default function GettingStartedChecklist({ workspaceName, hasProjects }) {
  const { user, reload } = useSession();
  const [progress, setProgress] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/onboarding", { cache: "no-store" })
      .then((response) => response.json().catch(() => ({}))
        .then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (active && ok) setProgress(result);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  if (!user?.onboardingCompleted || user.checklistDismissed || isDismissed) {
    return null;
  }

  const skipped = progress?.data?.skipped ?? {};
  const items = [
    {
      label: "Workspace setup",
      done: Boolean(workspaceName),
      detail: workspaceName || "Choose a workspace",
    },
    {
      label: "Profile completion",
      done: !skipped.profile && Boolean(progress?.profile?.displayName),
      detail: skipped.profile ? "Skipped" : progress?.profile?.displayName || "Add your details",
    },
    {
      label: "Team invitation",
      done: Boolean(skipped.invitations || progress?.data?.invitationEmails?.length),
      detail: skipped.invitations ? "Skipped" : "Invite a teammate",
    },
    {
      label: "First project",
      done: hasProjects || Boolean(skipped.firstProject),
      detail: hasProjects ? "Project created" : "Create a project",
    },
  ];

  const completedCount = items.filter((item) => item.done).length;

  async function dismiss() {
    try {
      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistDismissed: true }),
      });
      if (response.ok) {
        setIsDismissed(true);
        await reload();
      }
    } catch {
      setIsDismissed(true);
    }
  }

  return (
    <section aria-labelledby="getting-started-heading" className="getting-started">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">GETTING STARTED</p>
          <h2 id="getting-started-heading" className="section-title">
            Set up {workspaceName || "your workspace"}
          </h2>
          <p className="section-description">
            {completedCount} of {items.length} steps complete.
          </p>
        </div>
        <button type="button" onClick={dismiss} className="button-quiet">
          Dismiss
        </button>
      </div>
      <ul className="getting-started-list">
        {items.map((item) => (
          <li
            key={item.label}
            className={`getting-started-item${item.done ? " is-done" : ""}`}
          >
            <span aria-hidden="true">{item.done ? "✓" : "○"}</span>
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </li>
        ))}
      </ul>
      <Link href="/projects" className="task-link">
        Go to projects
      </Link>
    </section>
  );
}
