"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";
import type { ParkingSpot } from "@/types";
import clsx from "clsx";
import { MapPin, ParkingCircle, ParkingCircleOffIcon } from "lucide-react";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-night-800/40">
      Loading map…
    </div>
  ),
});

type Filter = "all" | "credit" | "commercial";

export default function HomePage() {
  const supabase = createClient();
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("parking_spots")
        .select("*")
        .eq("is_active", true)
        .eq("verification_status", "verified");
      if (active && data) setSpots(data as ParkingSpot[]);
    }
    load();

    const channel = supabase
      .channel("public:parking_spots")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parking_spots" },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = spots.filter((s) => filter === "all" || s.mode === filter);

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-4 pt-5 pb-3">
        <h1 className="font-display flex items-center text-2xl font-bold text-night-900">
          <MapPin
            className="inline mr-2 p-2 bg-[#ffc94a] rounded border border-gray-700"
            size={40}
          />
          {/* Yellow underline matching your brand hex */}
          <span className="underline decoration-[#ffc94a] decoration-2 underline-offset-4">
            Park
          </span>
          {/* Black underline with a offset shift for readability */}
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
        <div className="h-full overflow-hidden rounded-xl2 shadow-card">
          <MapView spots={filtered} />
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
        "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition",
        active
          ? "bg-night-800 text-white"
          : "bg-white text-night-800/60 shadow-sm",
      )}
    >
      {children}
    </button>
  );
}
