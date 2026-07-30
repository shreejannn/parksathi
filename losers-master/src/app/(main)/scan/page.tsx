"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import type { ParkingSpot } from "@/types";
import { ScanLine } from "lucide-react";

const QRScanner = dynamic(() => import("@/components/QRScanner"), { ssr: false });

export default function ScanPage() {
  const supabase = createClient();
  const router = useRouter();

  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundSpot, setFoundSpot] = useState<ParkingSpot | null>(null);

  async function handleScan(text: string) {
    setScanning(false);
    setLoading(true);
    setError(null);
    setFoundSpot(null);

    const qrValue = text.trim();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const { data: spot } = await supabase
      .from("parking_spots")
      .select("*")
      .eq("qr_secret", qrValue)
      .single();

    if (!spot) {
      setError("This QR code doesn't match any ParkSathi spot.");
      setLoading(false);
      return;
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("spot_id", spot.id)
      .eq("driver_id", user.id)
      .in("status", ["reserved", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!booking) {
      setFoundSpot(spot as ParkingSpot);
      setLoading(false);
      return;
    }

    const fn = booking.status === "reserved" ? "start_parking_session" : "end_parking_session";
    const { error: rpcError } = await supabase.rpc(fn, {
      p_booking_id: booking.id,
      p_spot_qr_secret: qrValue,
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    router.push(`/session/${booking.id}`);
  }

  return (
    <div className="flex flex-col items-center px-4 pt-8 pb-8 text-center">
      <h1 className="font-display text-xl font-semibold text-night-900">Scan QR</h1>
      <p className="mt-1 max-w-xs text-sm text-night-800/50">
        Scan the ParkSathi sticker at any spot to start or end your parking session.
      </p>

      <div className="mt-8 w-full max-w-xs">
        {scanning ? (
          <QRScanner onScan={handleScan} onError={(m) => setError(m)} />
        ) : (
          <button
            onClick={() => {
              setError(null);
              setFoundSpot(null);
              setScanning(true);
            }}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal-amber py-4 font-semibold text-night-900 disabled:opacity-60"
          >
            <ScanLine className="h-5 w-5" />
            {loading ? "Checking…" : "Open camera"}
          </button>
        )}
      </div>

      {foundSpot && (
        <div className="mt-6 w-full max-w-xs rounded-xl2 bg-white p-4 text-left shadow-card">
          <p className="text-sm font-semibold text-night-900">{foundSpot.title}</p>
          <p className="mt-1 text-xs text-night-800/50">
            You don&apos;t have an active reservation for this spot yet.
          </p>
          <Link
            href={`/booking/${foundSpot.id}`}
            className="mt-3 block rounded-xl bg-night-800 py-2.5 text-center text-sm font-semibold text-white"
          >
            Reserve this spot
          </Link>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-signal-red">{error}</p>}
    </div>
  );
}
