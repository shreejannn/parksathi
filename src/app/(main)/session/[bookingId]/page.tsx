"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";
import type { Booking, ParkingSpot } from "@/types";
import { Star } from "lucide-react";

const QRScanner = dynamic(() => import("@/components/QRScanner"), { ssr: false });

export default function SessionPage() {
  const supabase = createClient();
  const { bookingId } = useParams<{ bookingId: string }>();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [rated, setRated] = useState(false);
  const [stars, setStars] = useState(5);

  async function load() {
    const { data: b } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
    if (b) {
      setBooking(b as Booking);
      const { data: s } = await supabase
        .from("parking_spots")
        .select("*")
        .eq("id", (b as Booking).spot_id)
        .single();
      setSpot(s as ParkingSpot);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    if (booking?.status !== "active" || !booking.started_at) return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(booking.started_at!).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [booking]);

  async function handleScan(text: string) {
    setScanning(false);
    setError(null);

    const fn = booking?.status === "reserved" ? "start_parking_session" : "end_parking_session";

    const { error: rpcError } = await supabase.rpc(fn, {
      p_booking_id: bookingId,
      p_spot_qr_secret: text.trim(),
    });

    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await load();
  }

  async function submitRating() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !spot || !booking) return;

    await supabase.from("ratings").insert({
      spot_id: spot.id,
      booking_id: booking.id,
      rater_id: user.id,
      stars,
    });
    setRated(true);
  }

  if (!booking || !spot) {
    return <div className="p-6 text-center text-night-800/40">Loading…</div>;
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center px-4 pt-8 text-center">
      <h1 className="font-display text-xl font-semibold text-night-900">{spot.title}</h1>
      <p className="mt-1 text-sm text-night-800/50">{spot.address}</p>

      {booking.status === "reserved" && (
        <div className="mt-8 w-full max-w-xs">
          <p className="mb-4 text-sm text-night-800/70">
            Arrived? Scan the ParkSathi QR sticker at the spot to start your session.
          </p>
          {scanning ? (
            <QRScanner onScan={handleScan} onError={(m) => setError(m)} />
          ) : (
            <button
              onClick={() => setScanning(true)}
              className="w-full rounded-xl bg-signal-amber py-3 font-semibold text-night-900"
            >
              Scan to start parking
            </button>
          )}
        </div>
      )}

      {booking.status === "active" && (
        <div className="mt-8 w-full max-w-xs">
          <div className="rounded-2xl bg-night-900 p-6 text-white">
            <p className="text-xs uppercase tracking-wide text-white/50">Session in progress</p>
            <p className="mt-2 font-mono text-4xl font-semibold">
              {mm}:{ss}
            </p>
          </div>
          <p className="mt-4 text-sm text-night-800/70">
            Leaving? Scan the same QR sticker again to end your session.
          </p>
          {scanning ? (
            <QRScanner onScan={handleScan} onError={(m) => setError(m)} />
          ) : (
            <button
              onClick={() => setScanning(true)}
              className="mt-2 w-full rounded-xl bg-night-800 py-3 font-semibold text-white"
            >
              Scan to end parking
            </button>
          )}
        </div>
      )}

      {booking.status === "completed" && (
        <div className="mt-8 w-full max-w-xs">
          <div className="rounded-2xl bg-signal-green/10 p-6">
            <p className="font-semibold text-signal-green">Session complete ✅</p>
            <p className="mt-2 text-sm text-night-800/70">
              Duration: {booking.duration_minutes} min
            </p>
            <p className="text-sm text-night-800/70">
              {booking.mode === "credit"
                ? `${booking.credits_charged} credits charged`
                : `Rs. ${booking.amount_charged} charged`}
            </p>
          </div>

          {!rated ? (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-night-900">Rate this spot</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setStars(n)}>
                    <Star
                      className={`h-8 w-8 ${
                        n <= stars ? "fill-signal-amber text-signal-amber" : "text-night-900/15"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <button
                onClick={submitRating}
                className="mt-4 w-full rounded-xl bg-night-800 py-3 font-semibold text-white"
              >
                Submit rating
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-night-800/50">Thanks for rating!</p>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-signal-red">{error}</p>}
    </div>
  );
}
