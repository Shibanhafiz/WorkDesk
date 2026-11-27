"use client";

import { useCallback, useEffect, useState } from "react";

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function formatTimestamp(value) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function authorizedUrl(path, workspaceId, userId) {
  const params = new URLSearchParams({ workspaceId, userId });
  return `${path}?${params.toString()}`;
}

export default function TaskCollaboration({
  taskId,
  workspaceId,
  userId,
  canManage,
}) {
  const [comments, setComments] = useState([]);
  const [issues, setIssues] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [issueText, setIssueText] = useState("");
  const [issueSeverity, setIssueSeverity] = useState("MEDIUM");
  const [uploadFile, setUploadFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const base = workspaceId
    ? `workspaceId=${encodeURIComponent(workspaceId)}&userId=${encodeURIComponent(userId)}`
    : `userId=${encodeURIComponent(userId)}`;

  async function getJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "Request failed.");
    return data;
  }

  const loadData = useCallback(async () => {
    if (!workspaceId) return null;
    const [loadedComments, loadedIssues, loadedAttachments, loadedTimeline] =
      await Promise.all([
        getJson(`/api/tasks/${taskId}/comments?${base}`),
        getJson(`/api/tasks/${taskId}/issues?${base}`),
        getJson(`/api/tasks/${taskId}/attachments?${base}`),
        getJson(`/api/tasks/${taskId}/activity?${base}`),
      ]);
    return {
      comments: loadedComments,
      issues: loadedIssues,
      attachments: loadedAttachments,
      timeline: loadedTimeline,
    };
  }, [taskId, base, workspaceId]);

  const applyData = useCallback((data) => {
    if (!data) return;
    setComments(data.comments);
    setIssues(data.issues);
    setAttachments(data.attachments);
    setTimeline(data.timeline);
  }, []);

  const reload = useCallback(async () => {
    try {
      applyData(await loadData());
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [loadData, applyData]);

  useEffect(() => {
    let isMounted = true;
    loadData()
      .then((data) => {
        if (isMounted) applyData(data);
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError.message);
      });
    return () => {
      isMounted = false;
    };
  }, [loadData, applyData]);

  async function addComment(event) {
    event.preventDefault();
    if (!commentText.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments?${base}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to add comment.");
      setCommentText("");
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addIssue(event) {
    event.preventDefault();
    if (!issueText.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${taskId}/issues?${base}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: issueText, severity: issueSeverity }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to record issue.");
      setIssueText("");
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resolveIssue(issue) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/issues/${issue.id}?${base}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution: "RESOLVED" }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to resolve issue.");
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadAttachment(event) {
    event.preventDefault();
    if (!uploadFile) return;
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const response = await fetch(`/api/tasks/${taskId}/attachments?${base}`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to upload file.");
      setUploadFile(null);
      event.target.reset();
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAttachment(attachment) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/attachments/${attachment.id}?${base}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Unable to delete attachment.");
      }
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!workspaceId) {
    return (
      <p className="section-description">
        Select a workspace to view collaboration details.
      </p>
    );
  }

  return (
    <div className="collaboration-panel">
      {error ? (
        <p role="alert" className="feedback feedback-error">
          {error}
        </p>
      ) : null}

      <section aria-labelledby="task-comments-heading" className="collab-section">
        <h3 id="task-comments-heading" className="section-title">
          Comments
        </h3>
        <ol className="comment-list">
          {comments.map((comment) => (
            <li key={comment.id} className="comment-entry">
              <strong>{comment.author?.name || comment.author?.email}</strong>
              <time dateTime={comment.createdAt}>
                {formatTimestamp(comment.createdAt)}
              </time>
              <p className="details-copy">{comment.content}</p>
            </li>
          ))}
        </ol>
        {comments.length === 0 ? (
          <p className="section-description">No comments yet.</p>
        ) : null}
        <form onSubmit={addComment} className="form-stack dialog-form">
          <label className="form-field">
            <span className="field-label">Add a comment</span>
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              rows="2"
              maxLength={2000}
              className="form-control"
              placeholder="Write a comment..."
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={busy || !commentText.trim()} className="button-secondary">
              Add comment
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="task-issues-heading" className="collab-section">
        <h3 id="task-issues-heading" className="section-title">
          Issues
        </h3>
        <ol className="comment-list">
          {issues.map((issue) => (
            <li key={issue.id} className="comment-entry">
              <div className="history-entry-header">
                <strong>{issue.severity}</strong>
                <span className={`status-tag ${issue.resolution === "OPEN" ? "status-testing-failed" : "status-done"}`}>
                  {issue.resolution}
                </span>
              </div>
              <p className="details-copy">{issue.description}</p>
              <p className="section-description">
                by {issue.createdBy?.name || issue.createdBy?.email} · {formatTimestamp(issue.createdAt)}
              </p>
              {issue.resolution === "OPEN" ? (
                <button
                  type="button"
                  onClick={() => resolveIssue(issue)}
                  disabled={busy || !canManage}
                  className="record-action"
                >
                  Resolve
                </button>
              ) : null}
            </li>
          ))}
        </ol>
        {issues.length === 0 ? (
          <p className="section-description">No issues recorded yet.</p>
        ) : null}
        <form onSubmit={addIssue} className="form-stack dialog-form">
          <label className="form-field">
            <span className="field-label">Issue description</span>
            <textarea
              value={issueText}
              onChange={(event) => setIssueText(event.target.value)}
              rows="2"
              maxLength={2000}
              className="form-control"
              placeholder="Describe the issue..."
            />
          </label>
          <label className="form-field">
            <span className="field-label">Severity</span>
            <select
              value={issueSeverity}
              onChange={(event) => setIssueSeverity(event.target.value)}
              className="form-control"
            >
              {SEVERITIES.map((severity) => (
                <option key={severity}>{severity}</option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" disabled={busy || !issueText.trim()} className="button-secondary">
              Record issue
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="task-attachments-heading" className="collab-section">
        <h3 id="task-attachments-heading" className="section-title">
          Attachments
        </h3>
        <ol className="comment-list">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="comment-entry">
              <div className="history-entry-header">
                <a
                  href={authorizedUrl(
                    `/api/tasks/${taskId}/attachments/${attachment.id}`,
                    workspaceId,
                    userId,
                  )}
                  className="task-link"
                >
                  {attachment.fileName}
                </a>
                <button
                  type="button"
                  onClick={() => deleteAttachment(attachment)}
                  disabled={busy}
                  className="record-action record-action-danger"
                >
                  Delete
                </button>
              </div>
              <p className="section-description">
                {attachment.mimeType} · {attachment.size} bytes · {formatTimestamp(attachment.createdAt)}
              </p>
            </li>
          ))}
        </ol>
        {attachments.length === 0 ? (
          <p className="section-description">No attachments yet.</p>
        ) : null}
        <form onSubmit={uploadAttachment} className="form-stack dialog-form">
          <label className="form-field">
            <span className="field-label">Upload image or document (max 10 MB)</span>
            <input
              type="file"
              onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              className="form-control"
              accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,.doc,.docx"
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={busy || !uploadFile} className="button-secondary">
              Upload
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="task-activity-heading" className="collab-section">
        <h3 id="task-activity-heading" className="section-title">
          Activity timeline
        </h3>
        {timeline.length === 0 ? (
          <p className="section-description">No activity recorded yet.</p>
        ) : (
          <ol className="history-timeline">
            {timeline.map((entry) => (
              <li key={entry.id} className="history-entry">
                <div className="history-entry-header">
                  <strong>{entry.label}</strong>
                  <time dateTime={entry.createdAt}>
                    {formatTimestamp(entry.createdAt)}
                  </time>
                </div>
                <p className="section-description">
                  by {entry.actor?.name || entry.actor?.email || "Unknown"}
                </p>
                {entry.details?.reason ? (
                  <p className="details-copy">Reason: {entry.details.reason}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
