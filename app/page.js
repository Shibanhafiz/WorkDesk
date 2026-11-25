"use client";

import Link from "next/link";
import PageHeader from "./components/PageHeader";
import StatCard from "./components/StatCard";
import TaskLoadState from "./components/TaskLoadState";
import TaskSummaryCard from "./components/TaskSummaryCard";
import { useSession } from "./components/SessionProvider";
import { useTasks } from "./lib/useTasks";
import { calculateTaskMetrics, sortTasks } from "./lib/taskInsights";
import { calculateProjectMetrics } from "./lib/projectInsights";
import { useProjects } from "./lib/useProjects";
import { useWorkspaces } from "./lib/useWorkspaces";
import ProjectStatusTag from "./components/ProjectStatusTag";
import GettingStartedChecklist from "./components/GettingStartedChecklist";
import WorkspaceActivity from "./components/WorkspaceActivity";

const priorityItems = [
  { value: "LOW", label: "Low", tone: "priority-low" },
  { value: "MEDIUM", label: "Medium", tone: "priority-medium" },
  { value: "HIGH", label: "High", tone: "priority-high" },
];

export default function OverviewPage() {
  const { user } = useSession();
  const { currentWorkspace } = useWorkspaces();
  const workspaceId = currentWorkspace?.id ?? null;
  const {
    tasks,
    todayDateKey,
    isLoading,
    error,
    reloadTasks,
  } = useTasks(workspaceId);
  const {
    projects,
    todayDateKey: projectsTodayDateKey,
    isLoading: areProjectsLoading,
    error: projectsError,
    reloadProjects,
  } = useProjects(workspaceId);
  const metrics = calculateTaskMetrics(tasks, todayDateKey);
  const projectMetrics = calculateProjectMetrics(
    projects,
    projectsTodayDateKey,
  );
  const recentTasks = sortTasks(tasks, "newest").slice(0, 4);
  const upcomingDeadlines = todayDateKey
    ? sortTasks(
        tasks.filter(
          (task) =>
            task.status !== "DONE" &&
            task.dueDate &&
            task.dueDate.slice(0, 10) >= todayDateKey,
        ),
        "due-date",
      ).slice(0, 4)
    : [];
  const stats = [
    { label: "Total tasks", value: metrics.total, detail: "Across the workspace" },
    { label: "To do", value: metrics.todo, detail: "Ready to begin" },
    {
      label: "In progress",
      value: metrics.inProgress,
      detail: "Currently underway",
    },
    {
      label: "Completed",
      value: metrics.completed,
      detail: "Marked complete",
    },
    {
      label: "Completion",
      value: `${metrics.completionPercentage}%`,
      detail: "Of all recorded tasks",
    },
    {
      label: "Overdue",
      value: metrics.overdue,
      detail: "Open tasks past due",
    },
    {
      label: "Upcoming",
      value: metrics.upcoming,
      detail: "Open tasks due today or later",
    },
  ];

  const myTaskCount = tasks.filter((task) => task.assignee?.id === user?.id).length;
  const dashboardLinks = currentWorkspace?.isPersonal
    ? [
        { label: "My tasks", value: myTaskCount, detail: "Assigned to you", href: "/my-tasks" },
        {
          label: "Upcoming deadlines",
          value: metrics.upcoming,
          detail: "Due today or later",
          href: "/upcoming",
        },
        {
          label: "High priority",
          value: metrics.priorities.HIGH,
          detail: "Needs attention",
          href: "/analytics",
        },
        {
          label: "Completion",
          value: `${metrics.completionPercentage}%`,
          detail: "Of workspace tasks",
          href: "/analytics",
        },
      ]
    : [
        {
          label: "Team tasks",
          value: metrics.total,
          detail: "In this workspace",
          href: "/tasks",
        },
        {
          label: "Completion rate",
          value: `${metrics.completionPercentage}%`,
          detail: "Tasks marked done",
          href: "/analytics",
        },
        {
          label: "Workload",
          value: new Set(tasks.map((task) => task.assigneeId).filter(Boolean)).size,
          detail: "Members with tasks",
          href: "/team",
        },
        {
          label: "Overdue",
          value: metrics.overdue,
          detail: "Open tasks past due",
          href: "/upcoming",
        },
      ];

  return (
    <div className="page-frame">
      <PageHeader
        number="01"
        eyebrow="YOUR WORKSPACE"
        title={user?.name ? `Welcome back, ${user.name}` : "Welcome back"}
        description="A clear view of your tasks, priorities, and what is coming next."
        meta={`${(currentWorkspace?.name ?? "Your workspace").toUpperCase()} · LIVE TASK REGISTER`}
        action={
          <Link href="/tasks" className="button-primary">
            <span aria-hidden="true">+</span>
            Add task
          </Link>
        }
      />

      <GettingStartedChecklist
        workspaceName={currentWorkspace?.name ?? ""}
        hasProjects={projects.length > 0}
      />

      <section aria-labelledby="workspace-snapshot-heading" className="workspace-snapshot">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">01 / WORKSPACE</p>
            <h2 id="workspace-snapshot-heading" className="section-title">
              {currentWorkspace?.isPersonal ? "Personal snapshot" : "Team snapshot"}
            </h2>
            <p className="section-description">
              Live figures from {currentWorkspace?.name ?? "this workspace"}. Select a figure to explore it.
            </p>
          </div>
        </div>
        <div className="metric-grid">
          {dashboardLinks.map((item) => (
            <Link key={item.label} href={item.href} className="metric-item metric-link">
              <span className="metric-label">{item.label}</span>
              <span className="metric-value">{item.value}</span>
              <span className="metric-detail">{item.detail}</span>
            </Link>
          ))}
        </div>
      </section>

      {!currentWorkspace?.isPersonal && workspaceId ? (
        <WorkspaceActivity
          workspaceId={workspaceId}
          workspaceName={currentWorkspace?.name ?? ""}
        />
      ) : null}

      <TaskLoadState
        isLoading={isLoading}
        error={error}
        onRetry={reloadTasks}
      >
        <section aria-label="Task statistics" className="metric-grid">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              detail={stat.detail}
              accent={index === 0 || index === 4}
            />
          ))}
        </section>

        <div className="overview-lower-grid">
          <div className="dashboard-primary">
            <section aria-labelledby="deadlines-heading" className="section-block">
              <div className="section-heading-row">
                <div>
                  <p className="section-kicker">01 / DATES</p>
                  <h2 id="deadlines-heading" className="section-title">
                    Upcoming deadlines
                  </h2>
                </div>
                <Link href="/upcoming" className="task-link">
                  Deadline view
                </Link>
              </div>
              {upcomingDeadlines.length > 0 ? (
                <div className="task-list">
                  {upcomingDeadlines.map((task) => (
                    <TaskSummaryCard key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p className="empty-state-title">
                    {tasks.length ? "No open deadlines ahead" : "No tasks in this workspace yet"}
                  </p>
                  <p className="empty-state-copy">
                    {tasks.length
                      ? "Tasks with a future due date will appear here."
                      : `Add a task in ${currentWorkspace?.name ?? "this workspace"} to get started.`}
                  </p>
                  <Link href="/tasks" className="text-link-button empty-state-action">
                    Add a task
                  </Link>
                </div>
              )}
            </section>

            <section aria-labelledby="recent-tasks-heading" className="section-block">
              <div className="section-heading-row">
                <div>
                  <p className="section-kicker">02 / REGISTER</p>
                  <h2 id="recent-tasks-heading" className="section-title">
                    Recent tasks
                  </h2>
                  <p className="section-description">
                    The latest additions to your workspace.
                  </p>
                </div>
                <Link href="/tasks" className="task-link">
                  All tasks
                </Link>
              </div>
              {recentTasks.length > 0 ? (
                <div className="task-list">
                  {recentTasks.map((task) => (
                    <TaskSummaryCard key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p className="empty-state-title">Nothing on the register</p>
                  <p className="empty-state-copy">
                    Tasks in {currentWorkspace?.name ?? "this workspace"} will appear here.
                  </p>
                  <Link href="/tasks" className="text-link-button empty-state-action">
                    Go to tasks
                  </Link>
                </div>
              )}
            </section>
          </div>

          <section
            aria-labelledby="priority-summary-heading"
            className="priority-summary section-block"
          >
            <div className="section-heading-row">
              <div>
                <p className="section-kicker">03 / DISTRIBUTION</p>
                <h2 id="priority-summary-heading" className="section-title">
                  Priority summary
                </h2>
                <p className="section-description">
                  Task counts by priority.
                </p>
              </div>
            </div>
            <div className="distribution-list">
              {priorityItems.map((item) => {
                const count = metrics.priorities[item.value];
                const percentage = metrics.total
                  ? Math.round((count / metrics.total) * 100)
                  : 0;

                return (
                  <div key={item.value} className="distribution-row">
                    <div className="distribution-copy">
                      <strong>{item.label}</strong>
                      <span className="distribution-count">
                        {count} · {percentage}%
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`${item.label} priority tasks`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentage}
                      className="progress-track"
                    >
                      <div
                        className={`progress-fill ${item.tone}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/analytics" className="task-link">
              View analytics
            </Link>
          </section>
        </div>
      </TaskLoadState>

      <section
        aria-labelledby="projects-overview-heading"
        className="projects-overview section-block"
      >
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">04 / PORTFOLIO</p>
            <h2 id="projects-overview-heading" className="section-title">
              Projects
            </h2>
            <p className="section-description">
              A live summary of project status and near-term deadlines.
            </p>
          </div>
          <Link href="/projects" className="task-link">
            All projects
          </Link>
        </div>

        {areProjectsLoading ? (
          <p role="status" className="state-panel">
            Loading project overview...
          </p>
        ) : projectsError ? (
          <div className="state-panel">
            <p role="alert" className="state-error">
              Project overview could not be loaded. {projectsError}
            </p>
            <button
              type="button"
              onClick={reloadProjects}
              className="text-link-button"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {projectMetrics.total === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No projects in this workspace yet</p>
                <p className="empty-state-copy">
                  Create a project in {currentWorkspace?.name ?? "this workspace"} to group related work.
                </p>
                <Link href="/projects" className="text-link-button empty-state-action">
                  Create your first project
                </Link>
              </div>
            ) : null}
            <div className="project-overview-metrics">
              <div className="project-overview-metric">
                <span className="metric-label">Total projects</span>
                <span className="metric-value">{projectMetrics.total}</span>
              </div>
              <div className="project-overview-metric">
                <span className="metric-label">Active</span>
                <span className="metric-value">{projectMetrics.active}</span>
              </div>
              <div className="project-overview-metric">
                <span className="metric-label">Completed</span>
                <span className="metric-value">{projectMetrics.completed}</span>
              </div>
              <div className="project-overview-metric">
                <span className="metric-label">Approaching deadlines</span>
                <span className="metric-value">
                  {projectMetrics.approachingDeadlines}
                </span>
              </div>
            </div>

            <div className="project-overview-lists">
              <section aria-labelledby="project-deadlines-heading">
                <div className="section-heading-row">
                  <div>
                    <p className="section-kicker">01 / DATES</p>
                    <h3
                      id="project-deadlines-heading"
                      className="section-title"
                    >
                      Approaching deadlines
                    </h3>
                  </div>
                </div>
                {projectMetrics.approachingProjects.length ? (
                  <div className="project-overview-list">
                    {projectMetrics.approachingProjects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="project-overview-row"
                      >
                        <span className="project-overview-name">
                          {project.name}
                        </span>
                        <span className="project-overview-date">
                          {project.dueDate
                            ? new Intl.DateTimeFormat("en", {
                                dateStyle: "medium",
                              }).format(
                                new Date(
                                  `${String(project.dueDate).slice(0, 10)}T00:00:00`,
                                ),
                              )
                            : "Not scheduled"}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p className="empty-state-copy">
                      No planning or active projects are due within seven days.
                    </p>
                  </div>
                )}
              </section>

              <section aria-labelledby="recent-projects-heading">
                <div className="section-heading-row">
                  <div>
                    <p className="section-kicker">02 / ACTIVITY</p>
                    <h3 id="recent-projects-heading" className="section-title">
                      Recently updated
                    </h3>
                  </div>
                </div>
                {projectMetrics.recentlyUpdated.length ? (
                  <div className="project-overview-list">
                    {projectMetrics.recentlyUpdated.map((project) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="project-overview-row"
                      >
                        <span className="project-overview-name">
                          {project.name}
                          <ProjectStatusTag status={project.status} />
                        </span>
                        <span className="project-overview-date">
                          {new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                          }).format(new Date(project.updatedAt))}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p className="empty-state-copy">
                      Updated projects will appear here.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
