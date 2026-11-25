import { useRef, useState } from "react";
import Dialog from "./Dialog";

const projectStatuses = [
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getDateInputValue(value) {
  if (!value) {
    return "";
  }

  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

export default function ProjectForm({
  initialProject,
  onSave,
  onClose,
  errorMessage,
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const isSubmitting = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting.current) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const status = formData.get("status");
    const startDate = String(formData.get("startDate") ?? "");
    const dueDate = String(formData.get("dueDate") ?? "");
    const validationErrors = {};

    if (!name) {
      validationErrors.name = "Enter a project name.";
    } else if (name.length > 100) {
      validationErrors.name = "Project name must be 100 characters or fewer.";
    }
    if (description.length > 1000) {
      validationErrors.description =
        "Description must be 1,000 characters or fewer.";
    }
    if (!projectStatuses.some((projectStatus) => projectStatus.value === status)) {
      validationErrors.status = "Choose a valid project status.";
    }
    if (startDate && !isValidDateOnly(startDate)) {
      validationErrors.startDate = "Enter a valid start date.";
    }
    if (dueDate && !isValidDateOnly(dueDate)) {
      validationErrors.dueDate = "Enter a valid due date.";
    }
    if (startDate && dueDate && startDate > dueDate) {
      validationErrors.dueDate =
        "Due date must be on or after the start date.";
    }

    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    isSubmitting.current = true;
    setIsSaving(true);
    try {
      await onSave({
        name,
        description: description || null,
        status,
        startDate: startDate || null,
        dueDate: dueDate || null,
      });
    } finally {
      isSubmitting.current = false;
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      labelledBy="project-form-heading"
      onClose={isSaving ? () => {} : onClose}
    >
      <div>
        <p className="section-kicker">PROJECT REGISTER / EDITION</p>
        <h2 id="project-form-heading" className="dialog-heading">
          {initialProject ? "Edit project" : "Create a project"}
        </h2>
        <p className="dialog-description">
          Record the purpose, status, and schedule for this project.
        </p>
      </div>

      {errorMessage ? (
        <p role="alert" className="feedback feedback-error dialog-feedback">
          {errorMessage}
        </p>
      ) : null}

      <form noValidate onSubmit={handleSubmit} className="form-stack dialog-form">
        <label className="form-field">
          <span className="field-label">Project name</span>
          <input
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={initialProject?.name ?? ""}
            placeholder="e.g. Website redesign"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "project-name-error" : undefined}
            onChange={() =>
              setFieldErrors((current) => ({ ...current, name: "" }))
            }
            className="form-control"
          />
          {fieldErrors.name ? (
            <span id="project-name-error" className="field-error">
              {fieldErrors.name}
            </span>
          ) : null}
        </label>

        <label className="form-field">
          <span className="field-label">Description</span>
          <textarea
            name="description"
            rows="3"
            maxLength={1000}
            defaultValue={initialProject?.description ?? ""}
            placeholder="What is this project working toward?"
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={
              fieldErrors.description ? "project-description-error" : undefined
            }
            onChange={() =>
              setFieldErrors((current) => ({ ...current, description: "" }))
            }
            className="form-control"
          />
          {fieldErrors.description ? (
            <span id="project-description-error" className="field-error">
              {fieldErrors.description}
            </span>
          ) : null}
        </label>

        <label className="form-field">
          <span className="field-label">Status</span>
          <select
            name="status"
            defaultValue={initialProject?.status ?? "PLANNING"}
            aria-invalid={Boolean(fieldErrors.status)}
            aria-describedby={
              fieldErrors.status ? "project-status-error" : undefined
            }
            onChange={() =>
              setFieldErrors((current) => ({ ...current, status: "" }))
            }
            className="form-control"
          >
            {projectStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          {fieldErrors.status ? (
            <span id="project-status-error" className="field-error">
              {fieldErrors.status}
            </span>
          ) : null}
        </label>

        <div className="form-grid">
          <label className="form-field">
            <span className="field-label">Start date</span>
            <input
              name="startDate"
              type="date"
              defaultValue={getDateInputValue(initialProject?.startDate)}
              aria-invalid={Boolean(fieldErrors.startDate)}
              aria-describedby={
                fieldErrors.startDate ? "project-start-date-error" : undefined
              }
              onChange={() =>
                setFieldErrors((current) => ({ ...current, startDate: "" }))
              }
              className="form-control"
            />
            {fieldErrors.startDate ? (
              <span id="project-start-date-error" className="field-error">
                {fieldErrors.startDate}
              </span>
            ) : null}
          </label>

          <label className="form-field">
            <span className="field-label">Due date</span>
            <input
              name="dueDate"
              type="date"
              defaultValue={getDateInputValue(initialProject?.dueDate)}
              aria-invalid={Boolean(fieldErrors.dueDate)}
              aria-describedby={
                fieldErrors.dueDate ? "project-due-date-error" : undefined
              }
              onChange={() =>
                setFieldErrors((current) => ({ ...current, dueDate: "" }))
              }
              className="form-control"
            />
            {fieldErrors.dueDate ? (
              <span id="project-due-date-error" className="field-error">
                {fieldErrors.dueDate}
              </span>
            ) : null}
          </label>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="button-secondary"
          >
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="button-primary">
            {isSaving
              ? "Saving..."
              : initialProject
                ? "Save changes"
                : "Create project"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
