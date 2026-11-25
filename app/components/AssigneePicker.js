"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ROLE_LABELS,
  SPECIALIZATION_LABELS,
} from "../lib/workspacePermissions";

function MemberAvatar({ member }) {
  if (member?.avatarUrl) {
    return (
      <Image
        src={member.avatarUrl}
        alt=""
        width={28}
        height={28}
        unoptimized
        className="assignee-avatar"
      />
    );
  }

  const source = member?.name || member?.email || "?";
  const initials = source
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="assignee-avatar" aria-hidden="true">
      {initials}
    </span>
  );
}

export default function AssigneePicker({ members, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selected = members.find((member) => member.userId === value) ?? null;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="assignee-picker" ref={containerRef}>
      <input type="hidden" name="assigneeId" value={value ?? ""} />
      <button
        type="button"
        className="form-control assignee-trigger"
        aria-labelledby="assignee-label"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {selected ? (
          <MemberAvatar member={selected} />
        ) : (
          <span className="assignee-avatar assignee-avatar-empty" aria-hidden="true">—</span>
        )}
        <span className="assignee-trigger-copy">
          <strong>{selected?.name || selected?.email || "Unassigned"}</strong>
          {selected ? (
            <small>{ROLE_LABELS[selected.role] || selected.role}</small>
          ) : null}
        </span>
      </button>

      {isOpen ? (
        <div role="listbox" aria-label="Task assignee" className="assignee-menu">
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className={`assignee-option${!value ? " is-selected" : ""}`}
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
          >
            <span className="assignee-avatar assignee-avatar-empty" aria-hidden="true">—</span>
            <span className="assignee-option-copy">
              <strong>Unassigned</strong>
              <small>Remove the current assignee</small>
            </span>
          </button>
          {members.map((member) => (
            <button
              key={member.userId}
              type="button"
              role="option"
              aria-selected={value === member.userId}
              className={`assignee-option${value === member.userId ? " is-selected" : ""}`}
              onClick={() => {
                onChange(member.userId);
                setIsOpen(false);
              }}
            >
              <MemberAvatar member={member} />
              <span className="assignee-option-copy">
                <strong>{member.name || member.email}</strong>
                <small>
                  {ROLE_LABELS[member.role] || member.role} ·{" "}
                  {SPECIALIZATION_LABELS[member.specialization] || member.specialization}
                </small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
