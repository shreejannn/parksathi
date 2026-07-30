"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import type { ParkingSpot, Vehicle, Profile } from "@/types";
import { Star, MapPin, Clock, ShieldAlert } from "lucide-react";
import DirectionsButton from "@/components/DirectionsButton";
import toast from "react-hot-toast";

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

export default function BookingPage() {
  const supabase = createClient();
  const router = useRouter();
  const { spotId } = useParams<{ spotId: string }>();

  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  const [host, setHost] = useState<Profile | null>(null);
  const [driverProfile, setDriverProfile] = useState<Profile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. New State to manage button hiding & directions showing
  const [isReserved, setIsReserved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: spotData } = await supabase
        .from("parking_spots")
        .select("*")
        .eq("id", spotId)
        .single();
      if (spotData) {
        setSpot(spotData as ParkingSpot);
        const { data: hostData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", (spotData as ParkingSpot).host_id)
          .single();
        setHost(hostData as Profile);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: v } = await supabase
          .from("vehicles")
          .select("*")
          .eq("owner_id", user.id);
        setVehicles((v as Vehicle[]) ?? []);
        if (v && v.length) setSelectedVehicle(v[0].id);

        const { data: me } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setDriverProfile(me as Profile);
      }

      if (navigator.geolocation && spotData) {
        navigator.geolocation.getCurrentPosition((p) => {
          setDistanceKm(
            haversineKm(
              { lat: p.coords.latitude, lng: p.coords.longitude },
              {
                lat: (spotData as ParkingSpot).latitude,
                lng: (spotData as ParkingSpot).longitude,
              },
            ),
          );
        });
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotId]);

  // 2. Production Ready Logic tied to State mutations
  async function handleReserve() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !spot) {
      toast.error("You must be logged in.");
      setLoading(false);
      return;
    }
    if (driverProfile?.verification_status !== "verified") {
      toast.error("You must verify your identity before booking a spot.");
      setLoading(false);
      return;
    }
    if (spot.available_slots <= 0) {
      toast.error("This spot is currently full.");
      setLoading(false);
      return;
    }

    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        spot_id: spot.id,
        driver_id: user.id,
        vehicle_id: selectedVehicle || null,
        mode: spot.mode,
      })
      .select()
      .single();

    setLoading(false);

    if (insertError || !booking) {
      toast.error(insertError?.message ?? "Could not reserve this spot.");
      return;
    }

    // Success Block
    toast.success("Reservation Successful!");
    setIsReserved(true);

    // Optional: If you still need a router redirect, you can add an artificial timeout here
    // setTimeout(() => router.push(`/session/${booking.id}`), 2000);
  }

  if (!spot) {
    return <div className="p-6 text-center text-night-800/40">Loading…</div>;
  }

  const etaMinutes =
    distanceKm != null ? Math.max(1, Math.round((distanceKm / 25) * 60)) : null;
  const isVerified = driverProfile?.verification_status === "verified";

  return (
    <div className="px-4 pt-5 pb-6">
      {!isVerified && (
        <Link
          href="/profile/verification"
          className="mb-4 flex items-start gap-3 rounded-xl2 bg-signal-amber/10 p-4 shadow-card"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-signal-amber" />
          <div>
            <p className="text-sm font-semibold text-night-900">
              Verify your identity to book
            </p>
            <p className="mt-0.5 text-xs text-night-800/60">
              {driverProfile?.verification_status === "pending"
                ? "Your verification is under review — you'll be able to book once it's approved."
                : "Submit your driving license for a quick review before your first booking."}
            </p>
          </div>
        </Link>
      )}

      <div className="rounded-xl2 bg-white p-4 shadow-card">
        <h1 className="font-display text-xl font-semibold text-night-900">
          {spot.title}
        </h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-night-800/50">
          <MapPin className="h-4 w-4" /> {spot.address}
        </p>

        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Badge>
            {spot.mode === "credit"
              ? `${spot.credit_per_hour} credit/hr`
              : `Rs. ${spot.price_per_hour}/hr`}
          </Badge>
          <Badge>
            {spot.available_slots}/{spot.total_slots} slots free
          </Badge>
          {spot.rating_count > 0 && (
            <Badge>
              <Star className="mr-1 inline h-3.5 w-3.5 fill-signal-amber text-signal-amber" />
              {spot.rating_avg.toFixed(1)} ({spot.rating_count})
            </Badge>
          )}
          {distanceKm != null && (
            <Badge>
              <MapPin className="mr-1 inline h-3.5 w-3.5" />
              {distanceKm.toFixed(1)} km
            </Badge>
          )}
          {etaMinutes != null && (
            <Badge>
              <Clock className="mr-1 inline h-3.5 w-3.5" />~{etaMinutes} min
            </Badge>
          )}
        </div>

        {host && (
          <div className="mt-4 flex items-center justify-between border-t border-night-900/5 pt-3">
            <div>
              <p className="text-sm font-medium text-night-900">
                {host.full_name ?? "Host"}
              </p>
              <p className="text-xs text-night-800/40">Spot host</p>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-signal-amber text-signal-amber" />
              {host.rating_avg.toFixed(1)} ({host.rating_count})
            </div>
          </div>
        )}

        {spot.description && (
          <p className="mt-3 text-sm text-night-800/70">{spot.description}</p>
        )}
      </div>

      <div className="mt-4 rounded-xl2 bg-white p-4 shadow-card">
        <p className="mb-2 text-sm font-medium text-night-900">
          Choose your vehicle
        </p>
        {vehicles.length === 0 ? (
          <p className="text-sm text-night-800/50">
            No vehicles yet — add one from your Profile page first.
          </p>
        ) : (
          <select
            value={selectedVehicle}
            disabled={isReserved} // Disable choice after booking
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3 disabled:opacity-60"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nickname} ({v.plate_number || "Unknown Vehicle"})
              </option>
            ))}
          </select>
        )}

        <div className="mt-5">
          {/* 3. Conditional Mutex: Button disappears and Directions Button mounts */}
          {!isReserved ? (
            <button
              onClick={handleReserve}
              disabled={loading || spot.available_slots <= 0 || !isVerified}
              className="w-full rounded-xl bg-signal-amber py-3 font-semibold text-night-900 disabled:opacity-50"
            >
              {loading
                ? "Reserving…"
                : !isVerified
                  ? "Verify to reserve"
                  : "Reserve"}
            </button>
          ) : (
            <DirectionsButton
              lat={spot.latitude}
              lng={spot.longitude}
              variant="outline"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Local mock Badge definition helper to resolve component errors if missing
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-night-900/5 px-2 py-1 text-xs font-medium text-night-800/60 ring-1 ring-inset ring-night-900/10">
      {children}
    </span>
  );
}
