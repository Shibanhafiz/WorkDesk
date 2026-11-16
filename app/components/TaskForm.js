import { useRef, useState } from "react";
import Dialog from "./Dialog";

const priorities = ["High", "Medium", "Low"];
const statuses = ["To Do", "In Progress", "Completed"];

function isValidDateOnly(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export default function TaskForm({
  initialTask,
  projects = [],
  projectsError = "",
  onReloadProjects,
  defaultProjectId = null,
  defaultProjectName = "",
  defaultPriority,
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
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const dueDate = String(formData.get("dueDate") ?? "");
    const priority = formData.get("priority");
    const status = formData.get("status");
    const projectId = String(formData.get("projectId") ?? "");
    const validationErrors = {};

    if (!title) {
      validationErrors.title =
        "Enter a title with at least one non-space character.";
    }
    if (title.length > 100) {
      validationErrors.title = "Title must be 100 characters or fewer.";
    }
    if (description.length > 1000) {
      validationErrors.description =
        "Description must be 1,000 characters or fewer.";
    }
    if (dueDate && !isValidDateOnly(dueDate)) {
      validationErrors.dueDate = "Enter a valid due date.";
    }
    if (!priorities.includes(priority)) {
      validationErrors.priority = "Choose a valid priority.";
    }
    if (!statuses.includes(status)) {
      validationErrors.status = "Choose a valid status.";
    }

    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    isSubmitting.current = true;
    setIsSaving(true);
    try {
      await onSave({
        title,
        description: description || null,
        priority,
        status,
        dueDate: dueDate || null,
        projectId: projectId || null,
      });
    } finally {
      isSubmitting.current = false;
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      labelledBy="task-form-heading"
      onClose={isSaving ? () => {} : onClose}
    >
      <div>
        <p className="section-kicker">TASK REGISTER / EDITION</p>
        <h2 id="task-form-heading" className="dialog-heading">
          {initialTask ? "Edit task" : "Add a task"}
        </h2>
        <p className="dialog-description">
          Add the details so you know what needs to get done.
        </p>
      </div>

      {errorMessage ? (
        <p role="alert" className="feedback feedback-error dialog-feedback">
          {errorMessage}
        </p>
      ) : null}
      {projectsError ? (
        <p role="alert" className="feedback feedback-error dialog-feedback">
          Project options could not be loaded. {projectsError} You can still
          save this task as unassigned.
          {onReloadProjects ? (
            <button
              type="button"
              onClick={onReloadProjects}
              className="text-link-button"
            >
              Try again
            </button>
          ) : null}
        </p>
      ) : null}

      <form noValidate onSubmit={handleSubmit} className="form-stack dialog-form">
        <label className="form-field">
          <span className="field-label">Title</span>
          <input
            name="title"
            type="text"
            required
            maxLength={100}
            defaultValue={initialTask?.title ?? ""}
            placeholder="What needs to be done?"
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? "title-error" : undefined}
            onChange={() =>
              setFieldErrors((current) => ({ ...current, title: "" }))
            }
            className="form-control"
          />
          {fieldErrors.title ? (
            <span id="title-error" className="field-error">
              {fieldErrors.title}
            </span>
          ) : null}
        </label>

        <label className="form-field">
          <span className="field-label">Description</span>
          <textarea
            name="description"
            rows="3"
            maxLength={1000}
            defaultValue={initialTask?.description ?? ""}
            placeholder="Add a few details..."
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={
              fieldErrors.description ? "description-error" : undefined
            }
            onChange={() =>
              setFieldErrors((current) => ({ ...current, description: "" }))
            }
            className="form-control"
          />
          {fieldErrors.description ? (
            <span id="description-error" className="field-error">
              {fieldErrors.description}
            </span>
          ) : null}
        </label>

        <div className="form-grid">
          <label className="form-field">
            <span className="field-label">Priority</span>
            <select
              name="priority"
              defaultValue={initialTask?.priority ?? defaultPriority}
              aria-invalid={Boolean(fieldErrors.priority)}
              aria-describedby={fieldErrors.priority ? "priority-error" : undefined}
              onChange={() =>
                setFieldErrors((current) => ({ ...current, priority: "" }))
              }
              className="form-control"
            >
              {priorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
            {fieldErrors.priority ? (
              <span id="priority-error" className="field-error">
                {fieldErrors.priority}
              </span>
            ) : null}
          </label>

          <label className="form-field">
            <span className="field-label">Status</span>
            <select
              name="status"
              defaultValue={initialTask?.status ?? "To Do"}
              aria-invalid={Boolean(fieldErrors.status)}
              aria-describedby={fieldErrors.status ? "status-error" : undefined}
              onChange={() =>
                setFieldErrors((current) => ({ ...current, status: "" }))
              }
              className="form-control"
            >
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            {fieldErrors.status ? (
              <span id="status-error" className="field-error">
                {fieldErrors.status}
              </span>
            ) : null}
          </label>
        </div>

        <label className="form-field">
          <span className="field-label">Project</span>
          <select
            name="projectId"
            defaultValue={
              initialTask?.projectId ?? defaultProjectId ?? ""
            }
            className="form-control"
          >
            <option value="">Unassigned</option>
            {initialTask?.projectId &&
            !projects.some((project) => project.id === initialTask.projectId) ? (
              <option value={initialTask.projectId}>
                {initialTask.project?.name ?? "Current project"}
              </option>
            ) : null}
            {!initialTask?.projectId &&
            defaultProjectId &&
            !projects.some((project) => project.id === defaultProjectId) ? (
              <option value={defaultProjectId}>
                {defaultProjectName || "Current project"}
              </option>
            ) : null}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
                {project.status === "ARCHIVED" ? " — Archived" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span className="field-label">Due date</span>
          <input
            name="dueDate"
            type="date"
            defaultValue={initialTask?.dueDate?.slice(0, 10) ?? ""}
            aria-invalid={Boolean(fieldErrors.dueDate)}
            aria-describedby={fieldErrors.dueDate ? "due-date-error" : undefined}
            onChange={() =>
              setFieldErrors((current) => ({ ...current, dueDate: "" }))
            }
            className="form-control"
          />
          {fieldErrors.dueDate ? (
            <span id="due-date-error" className="field-error">
              {fieldErrors.dueDate}
            </span>
          ) : null}
        </label>

        <div className="form-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="button-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="button-primary"
          >
            {isSaving
              ? "Saving..."
              : initialTask
                ? "Save changes"
                : "Create task"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
