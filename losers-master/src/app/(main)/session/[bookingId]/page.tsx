"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import type { Booking, ParkingSpot } from "@/types";
import {
  Star,
  CheckCircle2,
  ParkingCircle,
  LogOut,
  Loader2,
  MapPin,
} from "lucide-react";
import clsx from "clsx";

interface ExtendedBooking extends Booking {
  parking_spots: ParkingSpot | null;
}

export default function SessionPage() {
  const supabase = createClient();
  const { bookingId } = useParams<{ bookingId: string }>();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  const [busy, setBusy] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [rated, setRated] = useState(false);
  const [stars, setStars] = useState(5);
  const [pageLoading, setPageLoading] = useState(true);

  // Memoize data aggregation load logic to prevent runtime dependency cycles
  const loadSessionData = useCallback(async () => {
    try {
      // Single-pass relational read operation replacing old sequential network waterfall
      const { data: entity, error: fetchError } = await supabase
        .from("bookings")
        .select("*, parking_spots(*)")
        .eq("id", bookingId)
        .single();

      if (fetchError) throw fetchError;

      if (entity) {
        const joinedPayload = entity as ExtendedBooking;
        setBooking(joinedPayload);
        setSpot(joinedPayload.parking_spots);

        if (joinedPayload.status === "completed") {
          const { data: existingRating } = await supabase
            .from("ratings")
            .select("id")
            .eq("booking_id", joinedPayload.id)
            .maybeSingle();
          setRated(!!existingRating);
        }
      }
    } catch (err: any) {
      console.error("Error synchronizing session data:", err.message);
      setError("Failed to fetch current session layout parameters.");
    } finally {
      setPageLoading(false);
    }
  }, [bookingId, supabase]);

  // Initial data hydration sync window
  useEffect(() => {
    if (bookingId) {
      loadSessionData();
    }
  }, [bookingId, loadSessionData]);

  // Establish live real-time synchronization channels
  useEffect(() => {
    if (!bookingId) return;

    const sessionChannel = supabase
      .channel(`live-session-feed:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        () => {
          loadSessionData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [bookingId, supabase, loadSessionData]);

  // Active runtime operational interval timer engine
  useEffect(() => {
    if (booking?.status !== "active" || !booking.started_at) return;

    const startTimestamp = new Date(booking.started_at).getTime();

    // Immediate execution update match invocation pass
    setElapsed(Math.floor((Date.now() - startTimestamp) / 1000));

    const intervalTimer = setInterval(() => {
      const distanceDelta = Math.floor((Date.now() - startTimestamp) / 1000);
      setElapsed(distanceDelta >= 0 ? distanceDelta : 0);
    }, 1000);

    return () => clearInterval(intervalTimer);
  }, [booking]);

  async function handleSessionAction() {
    if (!booking) return;
    setBusy(true);
    setError(null);

    try {
      const targetFunction =
        booking.status === "reserved"
          ? "start_parking_session"
          : "end_parking_session";

      const { error: rpcError } = await supabase.rpc(targetFunction, {
        p_booking_id: bookingId,
      });

      if (rpcError) throw rpcError;

      await loadSessionData();
    } catch (err: any) {
      console.error("Session status update execution exception:", err);
      setError(
        err.message ??
          "An unexpected transaction ledger mutation error occurred.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitRating() {
    if (!spot || !booking || ratingBusy) return;

    setRatingBusy(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Your authentication context has expired.");
        setRatingBusy(false);
        return;
      }

      const { error: ratingError } = await supabase.from("ratings").insert({
        spot_id: spot.id,
        booking_id: booking.id,
        rater_id: user.id,
        stars,
      });

      if (ratingError) {
        if (ratingError.code === "23505") {
          setError(
            "You have already documented a rating evaluation for this transaction.",
          );
          setRated(true);
        } else {
          throw ratingError;
        }
        return;
      }

      setRated(true);
    } catch (err: any) {
      console.error("Rating transaction processing exception:", err);
      setError(err.message ?? "Failed to properly persist rating parameters.");
    } finally {
      setRatingBusy(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-6 text-center text-sm font-medium text-night-800/40">
        <Loader2 className="h-5 w-5 animate-spin text-night-800/30" />
        <span>Synchronizing live parking stream parameters…</span>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="mx-auto mt-8 max-w-xs rounded-xl border border-signal-red/15 bg-signal-red/5 p-4 text-center text-xs font-semibold text-signal-red">
        {error}
      </div>
    );
  }

  if (!booking || !spot) return null;

  const minutesString = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secondsString = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center px-4 pt-8 pb-12 text-center max-w-sm mx-auto">
      <h1 className="font-display text-xl font-bold text-night-900 leading-tight">
        {spot.title}
      </h1>
      <p className="mt-1.5 text-xs font-medium text-night-800/50 flex items-center gap-1 justify-center">
        <MapPin size={12} className="text-night-800/30" />
        {spot.address}
      </p>

      {booking.status === "reserved" && (
        <div className="mt-8 w-full max-w-xs animate-fadeIn">
          <p className="mb-4 text-sm text-night-800/60 leading-relaxed">
            Arrived at the location? Select the confirmation control map below
            to initiate your checkout metrics.
          </p>
          <button
            type="button"
            onClick={handleSessionAction}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal-amber py-3.5 text-sm font-bold text-night-900 shadow-md transition hover:bg-[#ffc948] active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ParkingCircle className="h-4 w-4" />
            )}
            {busy ? "Activating Fleet Anchor…" : "Start Parking Session"}
          </button>
        </div>
      )}

      {booking.status === "active" && (
        <div className="mt-8 w-full max-w-xs animate-fadeIn">
          <div className="rounded-2xl bg-night-900 p-6 text-white shadow-xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-signal-amber animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Active Session Counter
            </p>
            <p className="mt-2.5 font-mono text-4xl font-bold tracking-tight text-white select-none">
              {minutesString}:{secondsString}
            </p>
          </div>
          <p className="mt-5 text-sm text-night-800/60 leading-relaxed">
            Preparing to depart? Clear your slot layout ledger by closing the
            metrics portal channel.
          </p>
          <button
            type="button"
            onClick={handleSessionAction}
            disabled={busy}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-night-800 py-3.5 text-sm font-bold text-white transition hover:bg-night-900 active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {busy ? "Finalizing Processing Records…" : "End Parking Session"}
          </button>
        </div>
      )}

      {booking.status === "completed" && (
        <div className="mt-8 w-full max-w-xs border border-gray-100 p-1 rounded-2xl bg-white shadow-card animate-fadeIn">
          <div className="rounded-xl2 bg-signal-green/5 border border-signal-green/10 p-5 text-center">
            <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-signal-green">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Reservation Complete
            </p>

            <div className="mt-4 space-y-1 text-xs font-semibold text-night-800/60">
              <p>
                Total Duration:{" "}
                <span className="text-night-900 font-bold">
                  {booking.duration_minutes} min
                </span>
              </p>
              <p className="text-[11px] text-night-800/40 font-mono mt-1 pt-1.5 border-t border-gray-100">
                Settled via:{" "}
                <span className="text-night-900 font-bold">
                  {booking.mode === "credit"
                    ? `${booking.credits_charged} Credits`
                    : `Rs. ${booking.amount_charged}`}
                </span>
              </p>
            </div>
          </div>

          {!rated ? (
            <div className="p-4 pt-5">
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-night-800/50">
                Evaluate Location Experience
              </p>
              <div className="flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((index) => (
                  <button
                    type="button"
                    key={index}
                    disabled={ratingBusy}
                    onClick={() => setStars(index)}
                    className="transition transform active:scale-95 hover:scale-105"
                  >
                    <Star
                      className={clsx(
                        "h-7 w-7 transition-colors duration-150",
                        index <= stars
                          ? "fill-signal-amber text-signal-amber"
                          : "text-gray-200",
                      )}
                    />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={submitRating}
                disabled={ratingBusy}
                className="mt-5 w-full rounded-xl bg-night-800 py-3 text-xs font-bold tracking-wide uppercase text-white transition hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {ratingBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                Submit Spot Evaluation
              </button>
            </div>
          ) : (
            <p className="my-4 text-xs font-bold text-signal-green bg-signal-green/5 py-2 px-3 rounded-lg mx-4">
              Thank you for verifying spot feedback metrics!
            </p>
          )}
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
