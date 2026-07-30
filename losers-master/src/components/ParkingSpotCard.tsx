import Link from "next/link";
import { Star, MapPin, BadgeCheck, ParkingCircle, Coins } from "lucide-react";
import type { ParkingSpot } from "@/types";
import DirectionsButton from "./DirectionsButton";

export default function ParkingSpotCard({
  spot,
  distanceKm,
}: {
  spot: ParkingSpot;
  distanceKm?: number | null;
}) {
  const full = spot.available_slots <= 0;

  return (
    <div className="rounded-xl2 bg-white p-3 shadow-card">
      <Link href={`/booking/${spot.id}`} className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-night-900/5">
          {spot.mode === "credit" ? (
            <ParkingCircle className="h-7 w-7 text-signal-green" />
          ) : (
            <Coins className="h-7 w-7 text-signal-amber" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1 truncate font-semibold text-night-900">
              <span className="truncate">{spot.title}</span>
              {spot.verification_status === "verified" && (
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-signal-green" />
              )}
            </p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                full
                  ? "bg-signal-red/15 text-signal-red"
                  : "bg-signal-green/15 text-signal-green"
              }`}
            >
              {full ? "FULL" : `${spot.available_slots} FREE`}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-night-800/50">
            <MapPin className="h-3 w-3 shrink-0" />{" "}
            {spot.address ?? "No address"}
            {distanceKm != null && ` · ${distanceKm.toFixed(1)} km`}
          </p>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-night-800">
              {spot.mode === "credit"
                ? `${spot.credit_per_hour} credit/hr`
                : `Rs. ${spot.price_per_hour}/hr`}
            </span>
            <span className="flex items-center gap-1 text-xs text-night-800/60">
              <Star className="h-3.5 w-3.5 fill-signal-amber text-signal-amber" />
              {spot.rating_count > 0 ? spot.rating_avg.toFixed(1) : "New"}
              {spot.rating_count > 0 && (
                <span className="text-night-800/30">({spot.rating_count})</span>
              )}
            </span>
          </div>
        </div>
      </Link>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={`/booking/${spot.id}`}
          className="flex items-center justify-center rounded-xl bg-signal-amber py-2.5 text-sm font-semibold text-night-900"
        >
          Reserve
        </Link>
        <DirectionsButton
          lat={spot.latitude}
          lng={spot.longitude}
          variant="outline"
          className="py-2.5"
        />
      </div>
    </div>
  );
}
