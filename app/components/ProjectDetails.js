"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import PageHeader from "./PageHeader";
import ProjectForm from "./ProjectForm";
import ProjectStatusTag from "./ProjectStatusTag";
import StatCard from "./StatCard";
import TaskManagement from "./TaskManagement";
import { calculateProjectTaskMetrics } from "../lib/projectInsights";

async function readApiResponse(response, fallbackMessage) {
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(responseBody?.error || fallbackMessage);
  }

  return responseBody;
}

function formatDate(value) {
  if (!value) {
    return "Not scheduled";
  }

  const dateKey =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value).slice(0, 10);

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${dateKey}T00:00:00`));
}

export default function ProjectDetails({ initialProject }) {
  const [project, setProject] = useState(initialProject);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [projectFormError, setProjectFormError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const metrics = calculateProjectTaskMetrics(project.tasks);

  const refreshProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        cache: "no-store",
      });
      const updatedProject = await readApiResponse(
        response,
        "Unable to refresh project details.",
      );
      setProject(updatedProject);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to refresh project details.",
      });
    }
  }, [project.id]);

  async function saveProject(projectDetails) {
    setProjectFormError("");
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectDetails),
      });
      const updatedProject = await readApiResponse(
        response,
        "Unable to update project.",
      );
      setProject((currentProject) => ({
        ...currentProject,
        ...updatedProject,
      }));
      setFeedback({ type: "success", message: "Project updated." });
      setIsProjectFormOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update project.";
      setProjectFormError(message);
      setFeedback({ type: "error", message });
    }
  }

  async function archiveProject() {
    setIsArchiving(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      const archivedProject = await readApiResponse(
        response,
        "Unable to archive project.",
      );
      setProject((currentProject) => ({
        ...currentProject,
        ...archivedProject,
      }));
      setFeedback({
        type: "success",
        message: "Project archived. Its tasks remain saved.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Unable to archive project.",
      });
    } finally {
      setIsArchiving(false);
    }
  }

  const stats = [
    { label: "Total tasks", value: metrics.total, detail: "In this project" },
    { label: "Completed", value: metrics.completed, detail: "Marked complete" },
    { label: "Pending", value: metrics.pending, detail: "To do or in progress" },
    {
      label: "Completion",
      value: `${metrics.completionPercentage}%`,
      detail: "Of project tasks",
    },
  ];

  return (
    <div className="page-frame">
      <PageHeader
        number="02"
        eyebrow="PROJECT / DETAIL"
        title={project.name}
        description={
          project.description || "A focused view of this project's schedule and tasks."
        }
        meta={`START ${formatDate(project.startDate).toUpperCase()} · DUE ${formatDate(project.dueDate).toUpperCase()}`}
        action={
          <div className="project-header-actions">
            <button
              type="button"
              onClick={() => {
                setProjectFormError("");
                setIsProjectFormOpen(true);
              }}
              className="button-secondary"
            >
              Edit project
            </button>
            {project.status !== "ARCHIVED" ? (
              <button
                type="button"
                onClick={archiveProject}
                disabled={isArchiving}
                className="button-secondary"
              >
                {isArchiving ? "Archiving..." : "Archive project"}
              </button>
            ) : null}
          </div>
        }
      />

      <div className="project-detail-status">
        <ProjectStatusTag status={project.status} />
        <Link href="/projects" className="task-link">
          All projects
        </Link>
      </div>

      {feedback ? (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`feedback${feedback.type === "error" ? " feedback-error" : ""}`}
        >
          {feedback.message}
        </div>
      ) : null}

      <section aria-label="Project task statistics" className="metric-grid">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            detail={stat.detail}
            accent={index === 0 || index === 3}
          />
        ))}
      </section>

      <section className="project-schedule" aria-label="Project schedule">
        <div>
          <span className="metric-label">Start date</span>
          <span className="project-schedule-value">
            {formatDate(project.startDate)}
          </span>
        </div>
        <div>
          <span className="metric-label">Due date</span>
          <span className="project-schedule-value">
            {formatDate(project.dueDate)}
          </span>
        </div>
        <div>
          <span className="metric-label">Last updated</span>
          <span className="project-schedule-value">
            {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
              new Date(project.updatedAt),
            )}
          </span>
        </div>
      </section>

      <div className="project-task-section">
        <TaskManagement
          scopedProjectId={project.id}
          scopedProjectName={project.name}
          embedded
          onTaskChange={refreshProject}
        />
      </div>

      {isProjectFormOpen ? (
        <ProjectForm
          key={project.id}
          initialProject={project}
          onSave={saveProject}
          errorMessage={projectFormError}
          onClose={() => {
            setIsProjectFormOpen(false);
            setProjectFormError("");
          }}
        />
      ) : null}
    </div>
  );
}
