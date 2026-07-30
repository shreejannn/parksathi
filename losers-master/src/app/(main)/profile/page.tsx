import { createClient } from "@/lib/supabaseServer";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  Car,
  Coins,
  ChevronRight,
  ShieldCheck,
  Clock,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import type { Booking, Profile } from "@/types";
import { redirect } from "next/navigation";
import clsx from "clsx";

export const dynamic = "force-dynamic";

interface ExtendedBooking extends Booking {
  parking_spots: { title: string } | null;
}

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Parallelize secondary database queries to prevent sequential request waterfalls
  const [profileResponse, historyResponse] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("bookings")
      .select("*, parking_spots(title)")
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const profile = profileResponse.data as Profile | null;
  const history = historyResponse.data as ExtendedBooking[] | null;

  return (
    <div className="px-4 pt-8 pb-12 max-w-md mx-auto">
      <div className="flex flex-col items-center">
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt="User profile avatar"
            width={88}
            height={88}
            priority
            // Fixed non-standard spacing scale token h-22 to avoid element jitter
            className="h-[88px] w-[88px] rounded-full object-cover border border-gray-100 shadow-sm"
          />
        ) : (
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-night-800 text-2xl font-semibold text-white shadow-sm">
            {(profile?.full_name ?? user.email ?? "U")
              .slice(0, 1)
              .toUpperCase()}
          </div>
        )}

        <h1 className="mt-3.5 font-display text-lg font-bold text-night-900">
          {profile?.full_name || "ParkSathi User"}
        </h1>
        <p className="text-sm font-medium text-night-800/50">{user.email}</p>

        <div className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-night-800/70 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
          <Star className="h-3.5 w-3.5 fill-signal-amber text-signal-amber" />
          <span>
            {profile?.rating_avg ? profile.rating_avg.toFixed(1) : "5.0"}
          </span>
          <span className="text-night-800/40">
            ({profile?.rating_count ?? 0} reviews)
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl2 border border-gray-100 bg-white p-4 text-center shadow-card transition hover:border-gray-200">
          <Coins className="mx-auto mb-1 h-5 w-5 text-[#ffc948]" />
          <p className="font-display text-xl font-bold text-night-900">
            {profile?.credits ?? 0}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-night-800/40 mt-0.5">
            Wallet Balance
          </p>
        </div>

        <div className="rounded-xl2 border border-gray-100 bg-white p-4 text-center shadow-card transition hover:border-gray-200">
          <Car className="mx-auto mb-1 h-5 w-5 text-night-800/60" />
          <p className="font-display text-xl font-bold text-night-900">
            {profile?.is_host ? "Host Account" : "Driver Account"}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-night-800/40 mt-0.5">
            Account Tier
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-2.5">
        <Link
          href="/profile/vehicles"
          className="flex items-center justify-between rounded-xl2 border border-gray-100 bg-white p-4 shadow-card transition hover:bg-gray-50 active:scale-[0.99]"
        >
          <span className="text-sm font-semibold text-night-900">
            Manage Garage Vehicles
          </span>
          <ChevronRight className="h-4 w-4 text-night-800/40" />
        </Link>

        <Link
          href="/profile/verification"
          className="flex items-center justify-between rounded-xl2 border border-gray-100 bg-white p-4 shadow-card transition hover:bg-gray-50 active:scale-[0.99]"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-night-900">
            <ShieldCheck className="h-4 w-4 text-night-800/50" />
            Identity Verification Status
          </span>
          <div className="flex items-center gap-1.5">
            <VerificationPill
              status={profile?.verification_status ?? "unverified"}
            />
            <ChevronRight className="h-4 w-4 text-night-800/40" />
          </div>
        </Link>

        {profile?.is_admin && (
          <Link
            href="/admin"
            className="flex items-center justify-between rounded-xl2 bg-night-900 p-4 shadow-md transition hover:bg-black active:scale-[0.99]"
          >
            <span className="text-sm font-semibold text-white tracking-wide">
              Admin Command Dashboard
            </span>
            <ChevronRight className="h-4 w-4 text-white/70" />
          </Link>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-night-900 flex items-center gap-1.5 px-0.5">
          <Clock size={16} className="text-night-800/40" /> Recent Parking
          History
        </h2>
        <div className="space-y-2.5">
          {history?.length ? (
            history.map((b) => (
              <div
                key={b.id}
                className="rounded-xl2 border border-gray-100 bg-white p-3.5 shadow-card flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-night-900 truncate">
                    {b.parking_spots?.title ?? "Verified Space Listing"}
                  </p>
                  <BookingStatusBadge status={b.status} />
                </div>
                <div className="flex items-center justify-between text-xs font-medium text-night-800/40">
                  <time dateTime={b.created_at}>
                    {new Date(b.created_at).toLocaleDateString([], {
                      dateStyle: "medium",
                    })}
                  </time>
                  <span className="font-mono font-bold text-night-800/70">
                    {b.mode === "credit"
                      ? `${b.credits_charged} Credits`
                      : `Rs. ${b.amount_charged}`}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl2 bg-gray-50/50">
              <p className="text-xs font-medium text-night-800/40">
                No reservation logs found on this profile.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <LogoutButton />
      </div>
    </div>
  );
}

function VerificationPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    unverified: "bg-night-900/10 text-night-800/60",
    pending: "bg-signal-amber/15 text-signal-amber",
    verified: "bg-signal-green/15 text-signal-green",
    rejected: "bg-signal-red/15 text-signal-red",
  };
  const label: Record<string, string> = {
    unverified: "Not Started",
    pending: "In Review",
    verified: "Verified",
    rejected: "Rejected",
  };
  return (
    <span
      className={clsx(
        "rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase",
        styles[status] ?? styles.unverified,
      )}
    >
      {label[status] ?? "Not Started"}
    </span>
  );
}

function BookingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-signal-amber/12 text-signal-amber border-signal-amber/10",
    active: "bg-blue-50 text-blue-600 border-blue-100",
    completed: "bg-signal-green/12 text-signal-green border-signal-green/10",
    cancelled: "bg-signal-red/12 text-signal-red border-signal-red/10",
  };
  return (
    <span
      className={clsx(
        "rounded-md border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase shrink-0",
        styles[status] ?? "bg-gray-50 text-gray-500 border-gray-100",
      )}
    >
      {status}
    </span>
  );
}
