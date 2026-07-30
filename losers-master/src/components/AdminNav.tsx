"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ShieldCheck } from "lucide-react";

const items = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/verifications", label: "License verifications" },
  { href: "/admin/spots", label: "Parking spots" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-black/5 bg-night-900">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
        <ShieldCheck className="h-5 w-5 text-signal-amber" />
        <span className="font-display font-semibold text-white">ParkSathi Admin</span>
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2 no-scrollbar">
        {items.map((item) => {
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition",
                active ? "bg-signal-amber text-night-900" : "text-white/60 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
