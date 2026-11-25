"use client";

import { useState } from "react";
import Dialog from "./Dialog";

export default function LifecycleActionDialog({ action, task, onSubmit, onClose, error }) {
  const [reason, setReason] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [fieldError, setFieldError] = useState("");

  const requiresReason = action === "REJECT" || action === "REOPEN";
  const titleMap = {
    SUBMIT_FOR_TESTING: "Submit for testing",
    APPROVE: "Approve task",
    REJECT: "Reject testing",
    REOPEN: "Reopen task",
  };

  function handleSubmit(event) {
    event.preventDefault();
    if (requiresReason && reason.trim().length === 0) {
      setFieldError("A reason is required.");
      return;
    }
    onSubmit({ action, reason: reason.trim(), reviewComment: reviewComment.trim() });
  }

  return (
    <Dialog labelledBy="lifecycle-action-heading" onClose={onClose}>
      <div>
        <p className="section-kicker">TASK / WORKFLOW</p>
        <h2 id="lifecycle-action-heading" className="dialog-heading">
          {titleMap[action] ?? action}
        </h2>
        <p className="dialog-description">{task.title}</p>
      </div>

      {error || fieldError ? (
        <p role="alert" className="feedback feedback-error dialog-feedback">
          {error || fieldError}
        </p>
      ) : null}

      <form noValidate onSubmit={handleSubmit} className="form-stack dialog-form">
        {requiresReason ? (
          <label className="form-field">
            <span className="field-label">Reason (required)</span>
            <textarea
              name="reason"
              rows="3"
              maxLength={1000}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setFieldError("");
              }}
              placeholder="Explain why this action is needed..."
              className="form-control"
            />
          </label>
        ) : null}

        {action === "APPROVE" || action === "REJECT" ? (
          <label className="form-field">
            <span className="field-label">Review comments</span>
            <textarea
              name="reviewComment"
              rows="3"
              maxLength={2000}
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder="Optional review notes..."
              className="form-control"
            />
          </label>
        ) : null}

        <div className="form-actions">
          <button type="button" onClick={onClose} className="button-secondary">
            Cancel
          </button>
          <button type="submit" className="button-primary">
            Confirm
          </button>
        </div>
      </form>
    </Dialog>
  );
}
