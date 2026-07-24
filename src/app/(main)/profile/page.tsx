import { createClient } from "@/lib/supabaseServer";
import Link from "next/link";
import Image from "next/image";
import { Star, Car, Coins, ChevronRight } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import type { Booking } from "@/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: history } = await supabase
    .from("bookings")
    .select("*, parking_spots(title)")
    .eq("driver_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="px-4 pt-8 pb-6">
      <div className="flex flex-col items-center">
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt="Avatar"
            width={88}
            height={88}
            className="h-22 w-22 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-night-800 text-2xl font-semibold text-white">
            {(profile?.full_name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
          </div>
        )}
        <h1 className="mt-3 font-display text-lg font-semibold text-night-900">
          {profile?.full_name || "ParkSathi user"}
        </h1>
        <p className="text-sm text-night-800/50">{user.email}</p>
        <div className="mt-1 flex items-center gap-1 text-sm text-night-800/70">
          <Star className="h-4 w-4 fill-signal-amber text-signal-amber" />
          {profile?.rating_avg?.toFixed(1) ?? "5.0"} ({profile?.rating_count ?? 0} ratings)
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl2 bg-white p-4 text-center shadow-card">
          <Coins className="mx-auto mb-1 h-5 w-5 text-signal-amber" />
          <p className="font-display text-xl font-semibold text-night-900">
            {profile?.credits ?? 0}
          </p>
          <p className="text-xs text-night-800/50">Credits</p>
        </div>
        <div className="rounded-xl2 bg-white p-4 text-center shadow-card">
          <Car className="mx-auto mb-1 h-5 w-5 text-night-800/70" />
          <p className="font-display text-xl font-semibold text-night-900">
            {profile?.is_host ? "Host" : "Driver"}
          </p>
          <p className="text-xs text-night-800/50">Account type</p>
        </div>
      </div>

      <Link
        href="/profile/vehicles"
        className="mt-4 flex items-center justify-between rounded-xl2 bg-white p-4 shadow-card"
      >
        <span className="text-sm font-medium text-night-900">My vehicles</span>
        <ChevronRight className="h-4 w-4 text-night-800/40" />
      </Link>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-night-900">Parking history</h2>
        <div className="space-y-2">
          {(history as (Booking & { parking_spots: { title: string } | null })[] | null)?.length ? (
            history!.map((b) => (
              <div key={b.id} className="rounded-xl2 bg-white p-3 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-night-900">
                    {b.parking_spots?.title ?? "Parking spot"}
                  </p>
                  <span className="text-xs capitalize text-night-800/50">{b.status}</span>
                </div>
                <p className="mt-1 text-xs text-night-800/40">
                  {new Date(b.created_at).toLocaleDateString()} ·{" "}
                  {b.mode === "credit"
                    ? `${b.credits_charged} credits`
                    : `Rs. ${b.amount_charged}`}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-night-800/40">No parking sessions yet.</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
