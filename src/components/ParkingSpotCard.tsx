import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import type { ParkingSpot } from "@/types";

export default function ParkingSpotCard({ spot }: { spot: ParkingSpot }) {
  const full = spot.available_slots <= 0;

  return (
    <Link
      href={`/booking/${spot.id}`}
      className="flex gap-3 rounded-xl2 bg-white p-3 shadow-card"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-night-900/5 text-2xl">
        {spot.mode === "credit" ? "🅿️" : "💰"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold text-night-900">{spot.title}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              full ? "bg-signal-red/15 text-signal-red" : "bg-signal-green/15 text-signal-green"
            }`}
          >
            {full ? "FULL" : `${spot.available_slots} FREE`}
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-night-800/50">
          <MapPin className="h-3 w-3 shrink-0" /> {spot.address ?? "No address"}
        </p>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-night-800">
            {spot.mode === "credit"
              ? `${spot.credit_per_hour} credit/hr`
              : `Rs. ${spot.price_per_hour}/hr`}
          </span>
          <span className="flex items-center gap-1 text-xs text-night-800/60">
            <Star className="h-3.5 w-3.5 fill-signal-amber text-signal-amber" />
            4.8
          </span>
        </div>
      </div>
    </Link>
  );
}
