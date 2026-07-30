"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { ParkingSpot } from "@/types";
import clsx from "clsx";

type FilterStatus = "pending" | "verified" | "rejected" | "all";

export default function AdminSpotsPage() {
  const supabase = createClient();
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let q = supabase.from("parking_spots").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("verification_status", filter);
    const { data } = await q;
    setSpots((data as ParkingSpot[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function decide(spot: ParkingSpot, status: "verified" | "rejected") {
    setBusyId(spot.id);
    let notes: string | null = null;
    if (status === "rejected") {
      notes = window.prompt("Reason for rejection (shown to the host):", "") ?? "";
    }
    await supabase
      .from("parking_spots")
      .update({ verification_status: status, verification_notes: notes })
      .eq("id", spot.id);

    await supabase.from("notifications").insert({
      user_id: spot.host_id,
      title: status === "verified" ? "Spot approved" : "Spot rejected",
      body:
        status === "verified"
          ? `"${spot.title}" is now live and visible to drivers.`
          : notes || `"${spot.title}" was rejected. Please review and update it.`,
      data: { type: "spot_" + status, spot_id: spot.id },
    });

    setBusyId(null);
    load();
  }

  return (
    <div className="pb-8">
      <h1 className="font-display text-xl font-semibold text-night-900">Parking spots</h1>

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
        ) : spots.length === 0 ? (
          <p className="text-center text-sm text-night-800/40">Nothing here.</p>
        ) : (
          spots.map((s) => (
            <div key={s.id} className="rounded-xl2 bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-night-900">{s.title}</p>
                  <p className="text-xs text-night-800/50">{s.address}</p>
                  <p className="mt-1 text-xs text-night-800/50">
                    {s.mode === "credit" ? `${s.credit_per_hour} credit/hr` : `Rs. ${s.price_per_hour}/hr`}
                    {" · "}
                    {s.total_slots} slot(s)
                  </p>
                </div>
                {s.photo_url && (
                  <img
                    src={s.photo_url}
                    alt={s.title}
                    className="h-16 w-24 rounded-lg object-cover"
                  />
                )}
              </div>

              {s.verification_status === "pending" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busyId === s.id}
                    onClick={() => decide(s, "verified")}
                    className="flex-1 rounded-xl bg-signal-green py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busyId === s.id}
                    onClick={() => decide(s, "rejected")}
                    className="flex-1 rounded-xl bg-signal-red py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <p
                  className={clsx(
                    "mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize",
                    s.verification_status === "verified"
                      ? "bg-signal-green/15 text-signal-green"
                      : "bg-signal-red/15 text-signal-red"
                  )}
                >
                  {s.verification_status}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
