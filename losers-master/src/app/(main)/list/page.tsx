"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import ParkingSpotCard from "@/components/ParkingSpotCard";
import { haversineKm } from "@/lib/directions";
import type { ParkingSpot } from "@/types";
import { Plus, Search } from "lucide-react";
import clsx from "clsx";

type Tab = "browse" | "mine";
type Sort = "nearest" | "available";

export default function ListPage() {
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("browse");
  const [userId, setUserId] = useState<string | null>(null);
  const [browseSpots, setBrowseSpots] = useState<ParkingSpot[]>([]);
  const [mySpots, setMySpots] = useState<ParkingSpot[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("nearest");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
    );
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data: browse } = await supabase
        .from("parking_spots")
        .select("*")
        .eq("is_active", true)
        .eq("verification_status", "verified")
        .order("created_at", { ascending: false });
      setBrowseSpots((browse as ParkingSpot[]) ?? []);

      if (user) {
        const { data: mine } = await supabase
          .from("parking_spots")
          .select("*")
          .eq("host_id", user.id)
          .order("created_at", { ascending: false });
        setMySpots((mine as ParkingSpot[]) ?? []);
      }

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const distanceFor = (s: ParkingSpot) =>
    pos ? haversineKm(pos, { lat: s.latitude, lng: s.longitude }) : null;

  const list = tab === "browse" ? browseSpots : mySpots;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = list.filter(
      (s) =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        (s.address ?? "").toLowerCase().includes(q),
    );

    result = [...result].sort((a, b) => {
      if (sort === "available") {
        return b.available_slots - a.available_slots;
      }
      // nearest
      if (!pos) return 0;
      return (distanceFor(a) ?? Infinity) - (distanceFor(b) ?? Infinity);
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, query, sort, pos]);

  return (
    <div className="px-4 pt-5 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-night-900">
          Listings
        </h1>
        <Link
          href="/list/add"
          className="flex items-center gap-1 rounded-full bg-night-800 px-3 py-2 text-xs font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Add spot
        </Link>
      </div>

      <div className="mt-4 flex gap-2 rounded-full bg-night-900/5 p-1">
        <TabButton active={tab === "browse"} onClick={() => setTab("browse")}>
          Parking spots
        </TabButton>
        <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
          My listings
        </TabButton>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-night-900/10 bg-white px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-night-800/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or location"
            className="w-full bg-transparent text-sm outline-none placeholder:text-night-800/40"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="shrink-0 rounded-xl border border-night-900/10 bg-white px-3 text-sm text-night-800"
        >
          <option value="nearest">Nearest</option>
          <option value="available">Most available</option>
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="mt-10 text-center text-sm text-night-800/40">
            Loading…
          </p>
        ) : filtered.length ? (
          filtered.map((s) => (
            <div key={s.id}>
              <ParkingSpotCard spot={s} distanceKm={distanceFor(s)} />
              {tab === "mine" && (
                <div className="mt-1 px-1">
                  <StatusBadge status={s.verification_status} />
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="mt-10 text-center text-sm text-night-800/40">
            {tab === "browse"
              ? "No spots match your search yet."
              : "You haven't listed any spots yet."}
          </p>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex-1 rounded-full py-2 text-sm font-semibold transition",
        active ? "bg-white text-night-900 shadow-sm" : "text-night-800/50",
      )}
    >
      {children}
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: ParkingSpot["verification_status"];
}) {
  const styles: Record<string, string> = {
    pending: "bg-signal-amber/15 text-signal-amber",
    verified: "bg-signal-green/15 text-signal-green",
    rejected: "bg-signal-red/15 text-signal-red",
  };
  const label: Record<string, string> = {
    pending: "Pending review",
    verified: "Verified",
    rejected: "Rejected",
  };
  return (
    <span
      className={clsx(
        "rounded-full px-2 py-0.5 text-[10px] font-bold",
        styles[status],
      )}
    >
      {label[status]}
    </span>
  );
}
