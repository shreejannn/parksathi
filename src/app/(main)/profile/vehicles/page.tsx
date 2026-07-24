"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { Vehicle, VehicleType } from "@/types";
import { Trash2, Car } from "lucide-react";

const vehicleTypes: VehicleType[] = ["car", "bike", "scooter", "van", "other"];

export default function VehiclesPage() {
  const supabase = createClient();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [nickname, setNickname] = useState("");
  const [plate, setPlate] = useState("");
  const [type, setType] = useState<VehicleType>("car");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("vehicles")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at");
    setVehicles((data as Vehicle[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: insertError } = await supabase.from("vehicles").insert({
      owner_id: user.id,
      nickname: nickname || null,
      plate_number: plate,
      vehicle_type: type,
      is_default: vehicles.length === 0,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNickname("");
    setPlate("");
    load();
  }

  async function removeVehicle(id: string) {
    await supabase.from("vehicles").delete().eq("id", id);
    load();
  }

  return (
    <div className="px-4 pt-5 pb-8">
      <h1 className="font-display text-xl font-semibold text-night-900">My vehicles</h1>

      <div className="mt-4 space-y-2">
        {vehicles.length === 0 ? (
          <p className="text-sm text-night-800/40">No vehicles added yet.</p>
        ) : (
          vehicles.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-xl2 bg-white p-3 shadow-card"
            >
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 text-night-800/50" />
                <div>
                  <p className="text-sm font-medium text-night-900">
                    {v.nickname || v.vehicle_type}
                    {v.is_default && (
                      <span className="ml-2 rounded-full bg-signal-green/15 px-2 py-0.5 text-[10px] font-semibold text-signal-green">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-night-800/50">{v.plate_number}</p>
                </div>
              </div>
              <button onClick={() => removeVehicle(v.id)}>
                <Trash2 className="h-4 w-4 text-signal-red/70" />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={addVehicle} className="mt-6 space-y-3 rounded-xl2 bg-white p-4 shadow-card">
        <p className="text-sm font-semibold text-night-900">Add a vehicle</p>
        <input
          placeholder="Nickname (optional)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full rounded-xl border border-night-900/10 px-4 py-3"
        />
        <input
          required
          placeholder="Plate number"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          className="w-full rounded-xl border border-night-900/10 px-4 py-3"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as VehicleType)}
          className="w-full rounded-xl border border-night-900/10 px-4 py-3 capitalize"
        >
          {vehicleTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-signal-red">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-night-800 py-3 font-semibold text-white"
        >
          Add vehicle
        </button>
      </form>
    </div>
  );
}
