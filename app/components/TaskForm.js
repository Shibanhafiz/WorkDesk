import { useRef, useState } from "react";

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
    const validationErrors = {};

    if (!title) {
      validationErrors.title = "Enter a title with at least one non-space character.";
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
      });
    } finally {
      isSubmitting.current = false;
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-heading"
        className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-7"
      >
        <div className="mb-6">
          <h2
            id="task-form-heading"
            className="text-xl font-semibold tracking-tight text-slate-900"
          >
            {initialTask ? "Edit task" : "Add a task"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add the details so you know what needs to get done.
          </p>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            {errorMessage}
          </p>
        )}

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Title
            </span>
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
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
            />
            {fieldErrors.title && (
              <span id="title-error" className="mt-1 block text-xs text-rose-700">
                {fieldErrors.title}
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Description
            </span>
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
              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
            />
            {fieldErrors.description && (
              <span
                id="description-error"
                className="mt-1 block text-xs text-rose-700"
              >
                {fieldErrors.description}
              </span>
            )}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Priority
              </span>
              <select
                name="priority"
                defaultValue={initialTask?.priority ?? defaultPriority}
                aria-invalid={Boolean(fieldErrors.priority)}
                aria-describedby={
                  fieldErrors.priority ? "priority-error" : undefined
                }
                onChange={() =>
                  setFieldErrors((current) => ({ ...current, priority: "" }))
                }
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
              >
                {priorities.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
              {fieldErrors.priority && (
                <span
                  id="priority-error"
                  className="mt-1 block text-xs text-rose-700"
                >
                  {fieldErrors.priority}
                </span>
              )}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Status
              </span>
              <select
                name="status"
                defaultValue={initialTask?.status ?? "To Do"}
                aria-invalid={Boolean(fieldErrors.status)}
                aria-describedby={fieldErrors.status ? "status-error" : undefined}
                onChange={() =>
                  setFieldErrors((current) => ({ ...current, status: "" }))
                }
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              {fieldErrors.status && (
                <span
                  id="status-error"
                  className="mt-1 block text-xs text-rose-700"
                >
                  {fieldErrors.status}
                </span>
              )}
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Due date
            </span>
            <input
              name="dueDate"
              type="date"
              defaultValue={initialTask?.dueDate?.slice(0, 10) ?? ""}
              aria-invalid={Boolean(fieldErrors.dueDate)}
              aria-describedby={fieldErrors.dueDate ? "due-date-error" : undefined}
              onChange={() =>
                setFieldErrors((current) => ({ ...current, dueDate: "" }))
              }
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
            />
            {fieldErrors.dueDate && (
              <span
                id="due-date-error"
                className="mt-1 block text-xs text-rose-700"
              >
                {fieldErrors.dueDate}
              </span>
            )}
          </label>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-70"
            >
              {isSaving
                ? "Saving..."
                : initialTask
                  ? "Save changes"
                  : "Create task"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
