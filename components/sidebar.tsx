"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  HelpIcon,
  SettingsIcon,
  ShoppingIcon,
  SignOutIcon,
  UserIcon,
  VideoIcon,
} from "./icons";
import { Logo } from "./ui";
import { useApp } from "@/lib/store";

const NAV = [
  { href: "/", label: "Video", icon: VideoIcon, match: (p: string) => p === "/" || p.startsWith("/recipe") },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon, match: (p: string) => p.startsWith("/calendar") },
  { href: "/shopping", label: "Shopping", icon: ShoppingIcon, match: (p: string) => p.startsWith("/shopping") },
  { href: "/you", label: "You", icon: UserIcon, match: (p: string) => p.startsWith("/you") },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, profile, signOut } = useApp();

  const email = user?.email ?? "";
  const displayName = profile.displayName || email.split("@")[0] || "Your account";
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "··";

  return (
    <aside className="flex h-screen w-[236px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-5 pb-4 pt-5">
        <Link href="/" className="inline-flex">
          <Logo />
        </Link>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                active
                  ? "bg-brand-soft text-brand-dark"
                  : "text-ink-soft hover:bg-surface-muted hover:text-ink"
              }`}
            >
              <Icon className={active ? "text-brand" : "text-muted"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-3">
        <div className="mb-2 flex flex-col gap-1">
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith("/settings")
                ? "bg-brand-soft text-brand-dark"
                : "text-ink-soft hover:bg-surface-muted"
            }`}
          >
            <SettingsIcon className="text-muted" />
            Settings
          </Link>
          <Link
            href="/help"
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith("/help")
                ? "bg-brand-soft text-brand-dark"
                : "text-ink-soft hover:bg-surface-muted"
            }`}
          >
            <HelpIcon className="text-muted" />
            Help
          </Link>
        </div>

        <div className="flex items-center gap-3 border-t border-line px-2 pt-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-dark text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">
              {displayName}
            </div>
            <div className="truncate text-xs text-muted">{email || "—"}</div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <SignOutIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}
