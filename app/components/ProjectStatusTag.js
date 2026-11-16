const statusLabels = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export default function ProjectStatusTag({ status }) {
  return (
    <span className={`project-status-tag project-status-${status.toLowerCase()}`}>
      {statusLabels[status] ?? status}
    </span>
  );
}
