"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";
import type { ParkingSpot } from "@/types";
import clsx from "clsx";
import { MapPin } from "lucide-react";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-night-800/40 bg-gray-50/50">
      Loading map…
    </div>
  ),
});

type Filter = "all" | "credit" | "commercial";

export default function HomePage() {
  const supabase = createClient();
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Initial load of active & verified spots
    async function loadInitial() {
      try {
        const { data } = await supabase
          .from("parking_spots")
          .select("*")
          .eq("is_active", true)
          .eq("verification_status", "verified");

        if (active && data) {
          setSpots(data as ParkingSpot[]);
        }
      } catch (err) {
        console.error("Failed to load parking spots:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadInitial();

    // High-performance real-time listener modifying state locally without refetching
    const channel = supabase
      .channel("public:parking_spots")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parking_spots" },
        (payload) => {
          if (!active) return;

          const isEligible = (spot: ParkingSpot) =>
            spot.is_active && spot.verification_status === "verified";

          if (payload.eventType === "INSERT") {
            const newSpot = payload.new as ParkingSpot;
            if (isEligible(newSpot)) {
              setSpots((prev) => [...prev, newSpot]);
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedSpot = payload.new as ParkingSpot;
            setSpots((prev) => {
              const exists = prev.some((s) => s.id === updatedSpot.id);

              if (isEligible(updatedSpot)) {
                // If it meets criteria, update it or append it if it wasn't visible before
                return exists
                  ? prev.map((s) => (s.id === updatedSpot.id ? updatedSpot : s))
                  : [...prev, updatedSpot];
              } else {
                // Remove it if it was turned inactive or unverified
                return prev.filter((s) => s.id !== updatedSpot.id);
              }
            });
          } else if (payload.eventType === "DELETE") {
            const oldSpot = payload.old as { id: string };
            setSpots((prev) => prev.filter((s) => s.id !== oldSpot.id));
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filtered = spots.filter((s) => filter === "all" || s.mode === filter);

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-4 pt-5 pb-3">
        <h1 className="font-display flex items-center text-2xl font-bold text-night-900">
          <MapPin
            className="inline mr-2 p-2 bg-[#ffc94a] rounded border border-gray-700"
            size={40}
          />
          <span className="underline decoration-[#ffc94a] decoration-2 underline-offset-4">
            Park
          </span>
          <span className="text-[#ffc94a] underline decoration-black decoration-2 underline-offset-4">
            Sathi
          </span>
        </h1>

        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            All spots
          </Chip>
          <Chip
            active={filter === "credit"}
            onClick={() => setFilter("credit")}
          >
            Credit (community)
          </Chip>
          <Chip
            active={filter === "commercial"}
            onClick={() => setFilter("commercial")}
          >
            Commercial
          </Chip>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 px-4 pb-4">
        <div className="h-full overflow-hidden rounded-xl2 shadow-card bg-gray-50">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center text-night-800/40">
              Locating spots...
            </div>
          ) : (
            <MapView spots={filtered} />
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({
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
        "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-night-800/20",
        active
          ? "bg-night-800 text-white"
          : "bg-white text-night-800/60 shadow-sm hover:bg-gray-50",
      )}
    >
      {children}
    </button>
  );
}
