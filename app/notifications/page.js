"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import { useUnreadNotificationCount } from "../lib/useNotifications";

function formatTimestamp(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isInternalLink(link) {
  return typeof link === "string" && link.startsWith("/") && !link.startsWith("//");
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const { unreadCount, refresh } = useUnreadNotificationCount();

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to load notifications.");
      }
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load notifications.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/notifications", { cache: "no-store" })
      .then((response) =>
        response.json().catch(() => null).then((data) => ({ ok: response.ok, data })),
      )
      .then(({ ok, data }) => {
        if (!isMounted) return;
        if (!ok) {
          throw new Error(data?.error || "Unable to load notifications.");
        }
        setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
        setError("");
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load notifications.",
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function setRead(notification, read) {
    setBusyId(notification.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update notification.");
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read } : item,
        ),
      );
      await refresh();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Unable to update notification.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    setBusyId("all");
    setFeedback(null);
    try {
      const response = await fetch("/api/notifications", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update notifications.");
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setFeedback({ type: "success", message: "All notifications marked as read." });
      await refresh();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Unable to update notifications.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-frame">
      <PageHeader
        number="07"
        eyebrow="INBOX"
        title="Notifications"
        description="In-app updates about tasks assigned to you and other workspace events."
        meta={`${unreadCount} UNREAD`}
        action={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              disabled={busyId !== null}
              className="button-secondary"
            >
              {busyId === "all" ? "Marking..." : "Mark all as read"}
            </button>
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

      <section aria-labelledby="notifications-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">01 / UPDATES</p>
            <h2 id="notifications-heading" className="section-title">
              Recent notifications
            </h2>
            <p className="section-description">
              {notifications.length} {notifications.length === 1 ? "notification" : "notifications"} received in this browser session history.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p role="status" className="state-panel">Loading notifications...</p>
        ) : error ? (
          <div className="state-panel">
            <p role="alert" className="state-error">{error}</p>
            <button type="button" onClick={loadNotifications} className="text-link-button">
              Try again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No notifications yet</p>
            <p className="empty-state-copy">
              When a task is assigned to you, the update will appear here.
            </p>
          </div>
        ) : (
          <div className="project-register">
            {notifications.map((notification) => {
              const body = (
                <>
                  <h3 className="task-summary-title">{notification.title}</h3>
                  {notification.body ? (
                    <p className="task-description">{notification.body}</p>
                  ) : null}
                  <div className="task-summary-footer">
                    <span
                      className={`priority-tag ${notification.read ? "priority-low" : "priority-high"}`}
                    >
                      {notification.read ? "Read" : "Unread"}
                    </span>
                    <span className="task-summary-date">
                      {formatTimestamp(notification.createdAt)}
                    </span>
                  </div>
                </>
              );

              return (
                <article
                  key={notification.id}
                  className={`task-register-row${notification.read ? "" : " is-unread"}`}
                >
                  <div className="task-record-main">
                    {isInternalLink(notification.link) ? (
                      <Link
                        href={notification.link}
                        className="task-link"
                        onClick={() => {
                          if (!notification.read) setRead(notification, true);
                        }}
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </div>
                  <div className="task-record-actions">
                    <button
                      type="button"
                      className="record-action"
                      disabled={busyId === notification.id}
                      onClick={() => setRead(notification, !notification.read)}
                    >
                      {notification.read ? "Mark unread" : "Mark as read"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
