import Link from "next/link";
import ProjectStatusTag from "./ProjectStatusTag";

function formatDate(value) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
}

export default function ProjectCard({ project, onEdit, onArchive, isBusy }) {
  const taskCount = project._count?.tasks ?? project.tasks?.length ?? 0;

  return (
    <article className="project-register-row">
      <div className="project-record-main">
        <div className="project-record-title-row">
          <Link href={`/projects/${project.id}`} className="project-title-link">
            {project.name}
          </Link>
          <ProjectStatusTag status={project.status} />
        </div>
        {project.description ? (
          <p className="project-description">{project.description}</p>
        ) : null}
        <div className="project-metadata">
          <span>
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </span>
          <span>Due {formatDate(project.dueDate)}</span>
          <span>Started {formatDate(project.startDate)}</span>
        </div>
      </div>

      <div className="project-record-actions">
        <Link href={`/projects/${project.id}`} className="record-action">
          Details
        </Link>
        <button
          type="button"
          onClick={() => onEdit(project)}
          disabled={isBusy}
          className="record-action"
        >
          Edit
        </button>
        {project.status !== "ARCHIVED" ? (
          <button
            type="button"
            onClick={() => onArchive(project)}
            disabled={isBusy}
            className="record-action"
          >
            Archive
          </button>
        ) : null}
      </div>
    </article>
  );
}
