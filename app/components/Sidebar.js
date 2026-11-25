"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { usePreferences } from "./PreferencesProvider";
import { useWorkspaces } from "../lib/useWorkspaces";
import { useSession } from "./SessionProvider";
import { ROLE_LABELS } from "../lib/workspacePermissions";

const navigationGroups = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Overview", index: "01" },
      { href: "/projects", label: "Projects", index: "02" },
      { href: "/tasks", label: "All Tasks", index: "03" },
      { href: "/my-tasks", label: "My Tasks", index: "04" },
      { href: "/upcoming", label: "Upcoming", index: "05" },
      { href: "/analytics", label: "Analytics", index: "06" },
    ],
  },
  {
    label: "Team",
    items: [{ href: "/team", label: "Members", index: "07" }],
  },
  {
    label: "Preferences",
    items: [{ href: "/settings", label: "Settings", index: "08" }],
  },
];

function SidebarNavigation() {
  const pathname = usePathname();
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    selectionError,
  } = useWorkspaces();

  return (
    <nav aria-label="Main navigation" className="sidebar-nav">
      {navigationGroups.map((group) => (
        <div className="nav-group" key={group.label}>
          <p className="nav-group-label">{group.label}</p>
          {group.items.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className="nav-link"
              >
                <span aria-hidden="true" className="nav-index">
                  {item.index}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      {workspaces.length > 0 && (
        <div className="nav-group">
          <p className="nav-group-label">Workspace</p>
          <select
            className="nav-link workspace-select"
            aria-label="Active workspace"
            value={currentWorkspace?.id ?? ""}
            onChange={(e) => {
              const workspace = workspaces.find((ws) => ws.id === e.target.value);
              void setCurrentWorkspace(workspace ?? null);
            }}
          >
            <option value="">Select workspace</option>
            <optgroup label="Personal workspace">
              {workspaces
                .filter((ws) => ws.isPersonal)
                .map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Team workspaces">
              {workspaces
                .filter((ws) => !ws.isPersonal)
                .map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
            </optgroup>
          </select>
          {selectionError ? (
            <p role="alert" className="nav-workspace-error">
              {selectionError}
            </p>
          ) : null}
        </div>
      )}
    </nav>
  );
}

function SidebarNavigationFallback() {
  return (
    <nav aria-hidden="true" className="sidebar-nav sidebar-nav-fallback">
      <div className="nav-group">
        <p className="nav-group-label">Workspace</p>
        <span className="nav-link">01&nbsp; Overview</span>
        <span className="nav-link">02&nbsp; Projects</span>
        <span className="nav-link">03&nbsp; All Tasks</span>
        <span className="nav-link">04&nbsp; Upcoming</span>
        <span className="nav-link">05&nbsp; Analytics</span>
      </div>
      <div className="nav-group">
        <p className="nav-group-label">Team</p>
        <span className="nav-link">06&nbsp; Members</span>
      </div>
      <div className="nav-group">
        <p className="nav-group-label">Preferences</p>
        <span className="nav-link">07&nbsp; Settings</span>
      </div>
    </nav>
  );
}

export default function Sidebar() {
  const { preferences } = usePreferences();
  const { workspaces, currentWorkspace } = useWorkspaces();
  const { user, logout } = useSession();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand-row">
        <Link href="/" className="sidebar-brand" aria-label="WorkDesk home">
          <span aria-hidden="true" className="brand-mark">W</span>
          <span className="brand-name">WORKDESK</span>
        </Link>
      </div>

      <Suspense fallback={<SidebarNavigationFallback />}>
        <SidebarNavigation />
      </Suspense>

      <div className="sidebar-profile">
        <p className="sidebar-profile-label">Signed in as</p>
        <p className="sidebar-profile-name">
          {user?.name || user?.email || preferences.displayName || "—"}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="text-link-button sidebar-logout"
        >
          Sign out
        </button>
      </div>

      {currentWorkspace && (
        <div className="sidebar-workspace-badge">
          <span>{currentWorkspace.name}</span>
          {user?.role ? (
            <span className="priority-tag priority-medium">
              {ROLE_LABELS[user.role] || user.role}
            </span>
          ) : null}
        </div>
      )}
    </aside>
  );
}