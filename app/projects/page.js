"use client";

import { useState } from "react";
import PageHeader from "../components/PageHeader";
import ProjectCard from "../components/ProjectCard";
import ProjectForm from "../components/ProjectForm";
import { useProjects } from "../lib/useProjects";
import { sortProjects } from "../lib/projectInsights";

const projectStatuses = [
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

async function readApiResponse(response, fallbackMessage) {
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(responseBody?.error || fallbackMessage);
  }

  return responseBody;
}

export default function ProjectsPage() {
  const {
    projects,
    setProjects,
    isLoading,
    error: loadError,
    reloadProjects,
  } = useProjects();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectFormError, setProjectFormError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [busyProjectId, setBusyProjectId] = useState(null);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(normalizedSearch) ||
      (project.description ?? "").toLowerCase().includes(normalizedSearch);
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const visibleProjects = sortProjects(filteredProjects, sortOrder);
  const hasActiveFilters =
    searchTerm !== "" || statusFilter !== "all" || sortOrder !== "newest";

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setSortOrder("newest");
  }

  function openProjectForm(project = null) {
    setEditingProject(project);
    setProjectFormError("");
    setFeedback(null);
    setIsProjectFormOpen(true);
  }

  async function saveProject(projectDetails) {
    setProjectFormError("");
    const isEditing = Boolean(editingProject);

    try {
      const response = await fetch(
        isEditing ? `/api/projects/${editingProject.id}` : "/api/projects",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectDetails),
        },
      );
      const savedProject = await readApiResponse(
        response,
        "Unable to save project.",
      );

      setProjects((currentProjects) =>
        isEditing
          ? currentProjects.map((project) =>
              project.id === savedProject.id ? savedProject : project,
            )
          : [savedProject, ...currentProjects],
      );
      setFeedback({
        type: "success",
        message: isEditing ? "Project updated." : "Project created.",
      });
      setIsProjectFormOpen(false);
      setEditingProject(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save project.";
      setProjectFormError(message);
      setFeedback({ type: "error", message });
    }
  }

  async function archiveProject(project) {
    setBusyProjectId(project.id);
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
      setProjects((currentProjects) =>
        currentProjects.map((currentProject) =>
          currentProject.id === archivedProject.id
            ? archivedProject
            : currentProject,
        ),
      );
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
      setBusyProjectId(null);
    }
  }

  return (
    <div className="page-frame">
      <PageHeader
        number="02"
        title="Projects"
        description="A clear register for the work, schedule, and status of each project."
        meta={`${projects.length} ${projects.length === 1 ? "PROJECT" : "PROJECTS"} · TASKS REMAIN SAVED WHEN ARCHIVED`}
        action={
          <button
            type="button"
            onClick={() => openProjectForm()}
            className="button-primary"
          >
            <span aria-hidden="true">+</span>
            Add project
          </button>
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

      <section aria-labelledby="projects-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">01 / REGISTER</p>
            <h2 id="projects-heading" className="section-title">
              Project register
            </h2>
            <p className="section-description">
              Showing {visibleProjects.length} of {projects.length} projects
            </p>
          </div>
        </div>

        <div className="project-toolbar">
          <label>
            <span className="sr-only">Search projects by name or description</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search projects"
              className="form-control"
            />
          </label>

          <label>
            <span className="sr-only">Filter projects by status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="form-control"
            >
              <option value="all">All statuses</option>
              {projectStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Sort projects</span>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className="form-control"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="deadline">Deadline (earliest)</option>
            </select>
          </label>
        </div>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="text-link-button"
          >
            Clear filters
          </button>
        ) : null}

        {isLoading ? (
          <p role="status" className="state-panel">
            Loading projects...
          </p>
        ) : loadError ? (
          <div className="state-panel">
            <p role="alert" className="state-error">
              Projects could not be loaded. {loadError}
            </p>
            <button
              type="button"
              onClick={reloadProjects}
              className="text-link-button"
            >
              Try again
            </button>
          </div>
        ) : visibleProjects.length > 0 ? (
          <div className="project-register">
            {visibleProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={openProjectForm}
                onArchive={archiveProject}
                isBusy={busyProjectId === project.id}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3 className="empty-state-title">
              {projects.length === 0
                ? "No projects yet"
                : "No projects match these filters"}
            </h3>
            <p className="empty-state-copy">
              {projects.length === 0
                ? "Create a project to give related tasks a shared home."
                : "Clear the filters or try a different search."}
            </p>
            {projects.length === 0 ? (
              <button
                type="button"
                onClick={() => openProjectForm()}
                className="button-primary empty-state-action"
              >
                Create your first project
              </button>
            ) : (
              <button
                type="button"
                onClick={clearFilters}
                className="text-link-button empty-state-action-secondary"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>

      {isProjectFormOpen ? (
        <ProjectForm
          key={editingProject ? editingProject.id : "new-project"}
          initialProject={editingProject}
          onSave={saveProject}
          errorMessage={projectFormError}
          onClose={() => {
            setIsProjectFormOpen(false);
            setEditingProject(null);
            setProjectFormError("");
          }}
        />
      ) : null}
    </div>
  );
}
