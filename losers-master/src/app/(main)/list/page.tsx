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

interface EnhancedSpot {
  spot: ParkingSpot;
  distance: number | null;
}

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

  // 1. Safe Geolocation hook with unmount guard
  useEffect(() => {
    let isMounted = true;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (isMounted) {
          setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        }
      },
      (err) => console.warn("Location tracking baseline rejected:", err.message),
      { timeout: 10000 }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Parallel data fetching optimization
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);

        const [userResult, browseResult] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("parking_spots")
            .select("*")
            .eq("is_active", true)
            .eq("verification_status", "verified")
            .order("created_at", { ascending: false })
        ]);

        if (!isMounted) return;

        const user = userResult.data?.user;
        setUserId(user?.id ?? null);
        setBrowseSpots((browseResult.data as ParkingSpot[]) ?? []);

        if (user) {
          const { data: mine } = await supabase
            .from("parking_spots")
            .select("*")
            .eq("host_id", user.id)
            .order("created_at", { ascending: false });

          if (isMounted && mine) {
            setMySpots(mine as ParkingSpot[]);
          }
        }
      } catch (err) {
        console.error("Failed to load listings metadata:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const rawList = tab === "browse" ? browseSpots : mySpots;

  // 3. High-performance single-pass calculation matrix
  const filteredAndSorted = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    // Pass 1: Filter raw listings
    const matchedSpots = rawList.filter(
      (s) =>
        !cleanQuery ||
        s.title.toLowerCase().includes(cleanQuery) ||
        (s.address ?? "").toLowerCase().includes(cleanQuery),
    );

    // Pass 2: Map to transient structure calculating distances exactly once ($O(N)$)
    const enhancedList: EnhancedSpot[] = matchedSpots.map((s) => ({
      spot: s,
      distance: pos ? haversineKm(pos, { lat: s.latitude, lng: s.longitude }) : null
    }));

    // Pass 3: Sort using cached properties ($O(N \log N)$ safe comparisons)
    enhancedList.sort((a, b) => {
      if (sort === "available") {
        return b.spot.available_slots - a.spot.available_slots;
      }
      
      if (a.distance === null || b.distance === null) return 0;
      return a.distance - b.distance;
    });

    return enhancedList;
  }, [rawList, query, sort, pos]);

  return (
    <div className="px-4 pt-5 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-night-900">
          Listings
        </h1>
        <Link
          href="/list/add"
          className="flex items-center gap-1 rounded-full bg-night-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-night-900 active:scale-[0.98]"
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
          <label htmlFor="search-listings" className="sr-only">
            Search listings by name or destination
          </label>
          <Search className="h-4 w-4 shrink-0 text-night-800/40" />
          <input
            id="search-listings"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or location"
            className="w-full bg-transparent text-sm outline-none placeholder:text-night-800/40"
          />
        </div>

        <div className="relative">
          <label htmlFor="sort-select" className="sr-only">
            Sort records parameters
          </label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-full shrink-0 rounded-xl border border-night-900/10 bg-white px-3 text-sm text-night-800 focus:outline-none focus:ring-2 focus:ring-night-800/10"
          >
            <option value="nearest">Nearest</option>
            <option value="available">Most available</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="mt-10 text-center text-sm text-night-800/40 animate-pulse">
            Syncing database details…
          </div>
        ) : filteredAndSorted.length ? (
          filteredAndSorted.map(({ spot, distance }) => (
            <div key={spot.id} className="group block">
              <ParkingSpotCard spot={spot} distanceKm={distance} />
              {tab === "mine" && (
                <div className="mt-1.5 px-1">
                  <StatusBadge status={spot.verification_status} />
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
        "flex-1 rounded-full py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-night-900/10",
        active ? "bg-white text-night-900 shadow-sm" : "text-night-800/50 hover:text-night-800",
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
        "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
        styles[status],
      )}
    >
      {label[status]}
    </span>
  );
}