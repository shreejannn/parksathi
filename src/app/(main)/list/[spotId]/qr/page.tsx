"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import type { ParkingSpot } from "@/types";

export default function SpotQrPage() {
  const supabase = createClient();
  const { spotId } = useParams<{ spotId: string }>();
  const [spot, setSpot] = useState<ParkingSpot | null>(null);

  useEffect(() => {
    supabase
      .from("parking_spots")
      .select("*")
      .eq("id", spotId)
      .single()
      .then(({ data }) => setSpot(data as ParkingSpot));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotId]);

  if (!spot) return <div className="p-6 text-center text-night-800/40">Loading…</div>;

  return (
    <div className="flex flex-col items-center px-4 pt-8 text-center">
      <h1 className="font-display text-lg font-semibold text-night-900">{spot.title}</h1>
      <p className="mb-6 text-sm text-night-800/50">
        Print this and stick it at the parking spot. Drivers scan it to start and end sessions.
      </p>
      <QRCodeDisplay value={spot.qr_secret} size={240} />
      <p className="mt-4 font-mono text-xs text-night-800/40">{spot.qr_secret}</p>
    </div>
  );
}
