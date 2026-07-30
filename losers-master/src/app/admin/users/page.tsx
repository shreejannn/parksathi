"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { Profile } from "@/types";
import { Search, ShieldCheck } from "lucide-react";
import clsx from "clsx";

export default function AdminUsersPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q)
    );
  }, [profiles, query]);

  async function toggleAdmin(p: Profile) {
    setBusyId(p.id);
    await supabase.from("profiles").update({ is_admin: !p.is_admin }).eq("id", p.id);
    setBusyId(null);
    load();
  }

  return (
    <div className="pb-8">
      <h1 className="font-display text-xl font-semibold text-night-900">Users</h1>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-night-900/10 bg-white px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-night-800/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone"
          className="w-full bg-transparent text-sm outline-none placeholder:text-night-800/40"
        />
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-center text-sm text-night-800/40">Loading…</p>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl2 bg-white p-3 shadow-card"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-sm font-medium text-night-900">
                  {p.full_name || "No name"}
                  {p.is_admin && <ShieldCheck className="h-3.5 w-3.5 text-signal-amber" />}
                </p>
                <p className="truncate text-xs text-night-800/50">
                  {p.phone} · {p.credits} credits ·{" "}
                  <span className="capitalize">{p.verification_status}</span>
                </p>
              </div>
              <button
                disabled={busyId === p.id}
                onClick={() => toggleAdmin(p)}
                className={clsx(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50",
                  p.is_admin
                    ? "bg-signal-red/10 text-signal-red"
                    : "bg-night-900/5 text-night-800/70"
                )}
              >
                {p.is_admin ? "Remove admin" : "Make admin"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
