"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { Profile } from "@/types";
import clsx from "clsx";

type FilterStatus = "pending" | "verified" | "rejected" | "all";

export default function AdminVerificationsPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let q = supabase
      .from("profiles")
      .select("*")
      .order("verification_submitted_at", { ascending: false, nullsFirst: false });
    if (filter !== "all") q = q.eq("verification_status", filter);
    const { data } = await q;
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function decide(id: string, status: "verified" | "rejected") {
    setBusyId(id);
    let notes: string | null = null;
    if (status === "rejected") {
      notes = window.prompt("Reason for rejection (shown to the user):", "") ?? "";
    }
    await supabase
      .from("profiles")
      .update({ verification_status: status, verification_notes: notes })
      .eq("id", id);

    await supabase.from("notifications").insert({
      user_id: id,
      title: status === "verified" ? "You're verified!" : "Verification rejected",
      body:
        status === "verified"
          ? "Your identity verification has been approved."
          : notes || "Your identity verification was rejected. Please resubmit.",
      data: { type: "verification_" + status },
    });

    setBusyId(null);
    load();
  }

  return (
    <div className="pb-8">
      <h1 className="font-display text-xl font-semibold text-night-900">License verifications</h1>

      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {(["pending", "verified", "rejected", "all"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium capitalize",
              filter === f ? "bg-night-800 text-white" : "bg-white text-night-800/60 shadow-sm"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-center text-sm text-night-800/40">Loading…</p>
        ) : profiles.length === 0 ? (
          <p className="text-center text-sm text-night-800/40">Nothing here.</p>
        ) : (
          profiles.map((p) => (
            <div key={p.id} className="rounded-xl2 bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-night-900">{p.full_name || "No name"}</p>
                  <p className="text-xs text-night-800/50">{p.phone}</p>
                  <p className="mt-1 text-xs text-night-800/50">
                    DOB: {p.date_of_birth ?? "—"} · License #: {p.license_number ?? "—"}
                  </p>
                </div>
                {p.license_photo_url && (
                  <a href={p.license_photo_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={p.license_photo_url}
                      alt="License"
                      className="h-16 w-24 rounded-lg object-cover"
                    />
                  </a>
                )}
              </div>

              {p.verification_status === "pending" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busyId === p.id}
                    onClick={() => decide(p.id, "verified")}
                    className="flex-1 rounded-xl bg-signal-green py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busyId === p.id}
                    onClick={() => decide(p.id, "rejected")}
                    className="flex-1 rounded-xl bg-signal-red py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <p
                  className={clsx(
                    "mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize",
                    p.verification_status === "verified"
                      ? "bg-signal-green/15 text-signal-green"
                      : "bg-signal-red/15 text-signal-red"
                  )}
                >
                  {p.verification_status}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
