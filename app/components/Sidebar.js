"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { usePreferences } from "./PreferencesProvider";

const navigationGroups = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Overview", index: "01" },
      { href: "/projects", label: "Projects", index: "02" },
      { href: "/tasks", label: "All Tasks", index: "03" },
      { href: "/upcoming", label: "Upcoming", index: "04" },
      { href: "/analytics", label: "Analytics", index: "05" },
    ],
  },
  {
    label: "Preferences",
    items: [{ href: "/settings", label: "Settings", index: "06" }],
  },
];

function SidebarNavigation() {
  const pathname = usePathname();

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
        <p className="nav-group-label">Preferences</p>
        <span className="nav-link">06&nbsp; Settings</span>
      </div>
    </nav>
  );
}

export default function Sidebar() {
  const { preferences } = usePreferences();
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
        <p className="sidebar-profile-label">Local profile</p>
        <p className="sidebar-profile-name">
          {preferences.displayName || "No display name set"}
        </p>
      </div>
    </aside>
  );
}
