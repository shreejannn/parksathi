"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import type { Booking, ParkingSpot } from "@/types";
import { Star, CheckCircle2, ParkingCircle, LogOut } from "lucide-react";

export default function SessionPage() {
  const supabase = createClient();
  const { bookingId } = useParams<{ bookingId: string }>();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  const [busy, setBusy] = useState(false);
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

      if ((b as Booking).status === "completed") {
        const { data: existingRating } = await supabase
          .from("ratings")
          .select("id")
          .eq("booking_id", (b as Booking).id)
          .maybeSingle();
        setRated(!!existingRating);
      }
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

  async function handleSessionAction() {
    setBusy(true);
    setError(null);

    const fn = booking?.status === "reserved" ? "start_parking_session" : "end_parking_session";

    const { error: rpcError } = await supabase.rpc(fn, {
      p_booking_id: bookingId,
    });

    setBusy(false);

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

    const { error: ratingError } = await supabase.from("ratings").insert({
      spot_id: spot.id,
      booking_id: booking.id,
      rater_id: user.id,
      stars,
    });

    if (ratingError) {
      setError(
        ratingError.code === "23505"
          ? "You've already rated this session."
          : ratingError.message,
      );
      return;
    }

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
            Arrived at the spot? Start your parking session below.
          </p>
          <button
            onClick={handleSessionAction}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal-amber py-3 font-semibold text-night-900 disabled:opacity-60"
          >
            <ParkingCircle className="h-5 w-5" />
            {busy ? "Starting…" : "Start parking session"}
          </button>
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
            Leaving? End your parking session below.
          </p>
          <button
            onClick={handleSessionAction}
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-night-800 py-3 font-semibold text-white disabled:opacity-60"
          >
            <LogOut className="h-5 w-5" />
            {busy ? "Ending…" : "End parking session"}
          </button>
        </div>
      )}

      {booking.status === "completed" && (
        <div className="mt-8 w-full max-w-xs">
          <div className="rounded-2xl bg-signal-green/10 p-6">
            <p className="flex items-center justify-center gap-2 font-semibold text-signal-green">
              <CheckCircle2 className="h-5 w-5" />
              Session complete
            </p>
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
