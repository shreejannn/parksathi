"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import type { ParkingSpot } from "@/types";
import { ScanLine, XCircle, Loader2, MapPin } from "lucide-react";
import toast from "react-hot-toast";

// Dynamically load scanner component safely with a clean fallback wireframe
const QRScanner = dynamic(() => import("@/components/QRScanner"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-square w-full max-w-xs items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-xs font-medium text-night-800/40 animate-pulse">
      Initializing optical camera system…
    </div>
  ),
});

export default function ScanPage() {
  const supabase = createClient();
  const router = useRouter();

  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundSpot, setFoundSpot] = useState<ParkingSpot | null>(null);

  async function handleScan(text: string) {
    // Immediate early containment to halt concurrent frame analysis pipelines
    if (loading) return;

    setScanning(false);
    setLoading(true);
    setError(null);
    setFoundSpot(null);

    const qrValue = text.trim();
    if (!qrValue) {
      setError("Scanned payload token appears empty or corrupted.");
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Session missing. Please re-authenticate.");
        router.push("/login");
        return;
      }

      // Query 1: Extract spot configuration metadata based on unique QR code secret mapping
      const { data: spot, error: spotError } = await supabase
        .from("parking_spots")
        .select("*")
        .eq("qr_secret", qrValue)
        .maybeSingle();

      if (spotError || !spot) {
        const msg =
          "This QR code doesn't match any registered ParkSathi locations.";
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      // Query 2: Look up high priority live booking dependencies matching this profile and resource
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("spot_id", spot.id)
        .eq("driver_id", user.id)
        .in("status", ["reserved", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bookingError) throw bookingError;

      // UX Guard: If no active booking ledger matching this driver exists, prompt spot acquisition
      if (!booking) {
        setFoundSpot(spot as ParkingSpot);
        toast.success(`Located spot: ${spot.title}`);
        setLoading(false);
        return;
      }

      // Route 3: Dynamic state toggle via secure remote procedure call functions
      const functionTarget =
        booking.status === "reserved"
          ? "start_parking_session"
          : "end_parking_session";

      const { error: rpcError } = await supabase.rpc(functionTarget, {
        p_booking_id: booking.id,
        p_spot_qr_secret: qrValue,
      });

      if (rpcError) throw rpcError;

      toast.success(
        booking.status === "reserved"
          ? "Parking session initiated successfully!"
          : "Parking session terminated successfully!",
      );

      router.push(`/session/${booking.id}`);
    } catch (err: any) {
      console.error("Internal processing operation failure:", err);
      setError(err.message ?? "An unexpected transaction fault occurred.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center px-4 pt-8 pb-12 text-center max-w-sm mx-auto">
      <h1 className="font-display text-xl font-bold text-night-900">
        Scan QR Code
      </h1>
      <p className="mt-1.5 max-w-xs text-sm text-night-800/50 leading-relaxed">
        Scan the official ParkSathi validation sticker affixed to the spot
        boundary to control your session state.
      </p>

      <div className="mt-8 w-full max-w-xs flex flex-col items-center gap-3">
        {scanning ? (
          <>
            <div className="w-full aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-black shadow-inner">
              <QRScanner onScan={handleScan} onError={(msg) => setError(msg)} />
            </div>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setScanning(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-semibold text-night-800 transition hover:bg-gray-50 active:scale-[0.99]"
            >
              <XCircle className="h-4 w-4 text-night-800/40" />
              Cancel Camera Scan
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setFoundSpot(null);
              setScanning(true);
            }}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal-amber py-4 text-sm font-bold text-night-900 shadow-md transition hover:bg-[#ffc948] disabled:opacity-50 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Synchronizing Ledger States…
              </>
            ) : (
              <>
                <ScanLine className="h-4 w-4" />
                Open Verification Camera
              </>
            )}
          </button>
        )}
      </div>

      {foundSpot && (
        <div className="mt-6 w-full max-w-xs rounded-xl2 border border-gray-100 bg-white p-4 text-left shadow-card animate-fadeIn">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-night-800/50 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-night-900">
                {foundSpot.title}
              </p>
              <p className="mt-1 text-xs text-night-800/50 leading-relaxed">
                You do not currently hold an active operational reservation
                layout booked for this sector spot.
              </p>
            </div>
          </div>

          <Link
            href={`/booking/${foundSpot.id}`}
            className="mt-4 block w-full rounded-xl bg-night-900 py-3 text-center text-xs font-bold tracking-wide uppercase text-white shadow-sm transition hover:bg-black active:scale-[0.99]"
          >
            Reserve Space Right Now
          </Link>
        </div>
      )}

      {error && (
        <div className="mt-4 w-full max-w-xs rounded-xl border border-signal-red/10 bg-signal-red/5 p-3 text-xs font-semibold text-signal-red animate-shake">
          {error}
        </div>
      )}
    </div>
  );
}
