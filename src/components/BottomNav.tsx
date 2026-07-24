"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, ListChecks, Bell, User } from "lucide-react";
import clsx from "clsx";

const items = [
  { href: "/home", label: "Home", icon: Map },
  { href: "/list", label: "Listings", icon: ListChecks },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

export default function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="relative flex flex-col items-center gap-1 py-1 text-xs"
              >
                <Icon
                  className={clsx(
                    "h-6 w-6 transition",
                    active ? "text-night-800" : "text-night-800/35"
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
                {label === "Alerts" && unreadCount > 0 && (
                  <span className="absolute right-4 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-signal-red px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                <span
                  className={clsx(
                    "font-medium",
                    active ? "text-night-800" : "text-night-800/35"
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
