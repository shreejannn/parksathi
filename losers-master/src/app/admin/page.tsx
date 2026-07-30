import { createClient } from "@/lib/supabaseServer";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const [
    { count: pendingVerifications },
    { count: pendingSpots },
    { count: totalUsers },
    { count: totalSpots },
    { count: totalBookings },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    supabase
      .from("parking_spots")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("parking_spots").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="pb-8">
      <h1 className="font-display text-xl font-semibold text-night-900">Overview</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard
          label="Pending license reviews"
          value={pendingVerifications ?? 0}
          href="/admin/verifications"
          highlight
        />
        <StatCard
          label="Pending spot reviews"
          value={pendingSpots ?? 0}
          href="/admin/spots"
          highlight
        />
        <StatCard label="Total users" value={totalUsers ?? 0} href="/admin/users" />
        <StatCard label="Total spots" value={totalSpots ?? 0} href="/admin/spots" />
        <StatCard label="Total bookings" value={totalBookings ?? 0} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href?: string;
  highlight?: boolean;
}) {
  const content = (
    <div
      className={`rounded-xl2 p-4 shadow-card ${
        highlight && value > 0 ? "bg-signal-amber/15" : "bg-white"
      }`}
    >
      <p className="font-display text-2xl font-semibold text-night-900">{value}</p>
      <p className="mt-1 text-xs text-night-800/50">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
