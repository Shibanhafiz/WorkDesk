import {
  ROLE_LABELS,
  SPECIALIZATION_LABELS,
} from "../lib/workspacePermissions";

export default function AssigneePicker({ members, value, onChange }) {
  return (
    <select
      name="assigneeId"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      aria-labelledby="assignee-label"
      className="form-control"
    >
      <option value="">Unassigned</option>
      {members.map((member) => (
        <option key={member.userId} value={member.userId}>
          {member.name || member.email} — {ROLE_LABELS[member.role] || member.role} · {SPECIALIZATION_LABELS[member.specialization] || member.specialization}
        </option>
      ))}
    </select>
  );
}
