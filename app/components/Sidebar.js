"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePreferences } from "./PreferencesProvider";

const navigationItems = [
  { href: "/", label: "Overview", marker: "O" },
  { href: "/tasks", label: "All Tasks", marker: "T" },
  { href: "/upcoming", label: "Upcoming", marker: "U" },
  { href: "/analytics", label: "Analytics", marker: "A" },
  { href: "/settings", label: "Settings", marker: "S" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { preferences } = usePreferences();

  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-6 lg:py-7">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="WorkDesk home"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            W
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            WorkDesk
          </span>
        </Link>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 lg:hidden">
          Workspace
        </span>
      </div>

      <nav
        aria-label="Main navigation"
        className="flex gap-2 overflow-x-auto px-4 pb-4 lg:mt-8 lg:flex-col lg:px-3"
      >
        <p className="hidden px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:block">
          Workspace
        </p>
        {navigationItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors lg:w-full ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-6 items-center justify-center rounded-md text-xs font-bold ${
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.marker}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-slate-200 px-6 py-5 lg:block">
        <p className="text-xs font-medium text-slate-500">Local profile</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
          {preferences.displayName || "No display name set"}
        </p>
      </div>
    </aside>
  );
}
