import { createClient } from "@/lib/supabaseServer";
import ParkingSpotCard from "@/components/ParkingSpotCard";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { ParkingSpot } from "@/types";

export const dynamic = "force-dynamic";

export default async function ListPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: spots } = await supabase
    .from("parking_spots")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <div className="px-4 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-night-900">
          Active listings
        </h1>
        <Link
          href="/list/add"
          className="flex items-center gap-1 rounded-full bg-night-800 px-3 py-2 text-xs font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Add spot
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {(spots as ParkingSpot[] | null)?.length ? (
          spots!.map((s) => (
            <div key={s.id}>
              <ParkingSpotCard spot={s} />
              {user && s.host_id === user.id && (
                <Link
                  href={`/list/${s.id}/qr`}
                  className="mt-1 inline-block text-xs font-medium text-night-800/50 underline"
                >
                  View printable QR code
                </Link>
              )}
            </div>
          ))
        ) : (
          <p className="mt-10 text-center text-sm text-night-800/40">
            No listings yet. Be the first to add your parking spot!
          </p>
        )}
      </div>
    </div>
  );
}
