"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { Vehicle, VehicleType } from "@/types";
import { Trash2, Car, Bike, Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const vehicleTypes: VehicleType[] = ["car", "bike", "scooter", "van", "other"];

export default function VehiclesPage() {
  const supabase = createClient();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [nickname, setNickname] = useState("");
  const [plate, setPlate] = useState("");
  const [type, setType] = useState<VehicleType>("car");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;
      setVehicles((data as Vehicle[]) ?? []);
    } catch (err: any) {
      console.error("Error pulling vehicle layout:", err.message);
      toast.error("Failed to load vehicle directory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      load();
    }
    return () => {
      isMounted = false;
    };
  }, []);

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const isFirstVehicle = vehicles.length === 0;

      // Leverage .select().single() to receive data back without making a separate load call
      const { data: newVehicle, error: insertError } = await supabase
        .from("vehicles")
        .insert({
          owner_id: user.id,
          nickname: nickname.trim() || null,
          plate_number: plate.trim().toUpperCase(),
          vehicle_type: type,
          is_default: isFirstVehicle,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setVehicles((prev) => [...prev, newVehicle as Vehicle]);
      setNickname("");
      setPlate("");
      setType("car");
      toast.success("Vehicle registered successfully!");
    } catch (insertError: any) {
      setError(insertError.message);
      toast.error("Could not register vehicle entry.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeVehicle(id: string) {
    if (deletingId) return;
    setDeletingId(id);

    try {
      const targetVehicle = vehicles.find((v) => v.id === id);
      
      const { error: deleteError } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      let updatedVehicles = vehicles.filter((v) => v.id !== id);

      // Fix: If we just deleted the default vehicle, promote the next available item
      if (targetVehicle?.is_default && updatedVehicles.length > 0) {
        const nextDefaultId = updatedVehicles[0].id;
        
        const { error: updateError } = await supabase
          .from("vehicles")
          .update({ is_default: true })
          .eq("id", nextDefaultId);

        if (!updateError) {
          updatedVehicles[0].is_default = true;
          toast.success("Default status shifted to secondary vehicle.");
        }
      }

      setVehicles(updatedVehicles);
      toast.success("Vehicle removed.");
    } catch (err: any) {
      console.error("Deletion error triggered:", err.message);
      toast.error("Failed to safely discard vehicle record.");
    } finally {
      setDeletingId(null);
    }
  }

  // Visual helper to render precise context iconography
  function getVehicleIcon(vehicleType: VehicleType) {
    switch (vehicleType) {
      case "bike":
      case "scooter":
        return <Bike className="h-5 w-5 text-night-800/60" />;
      default:
        return <Car className="h-5 w-5 text-night-800/60" />;
    }
  }

  return (
    <div className="px-4 pt-5 pb-12 max-w-md mx-auto">
      <h1 className="font-display text-xl font-semibold text-night-900">
        My vehicles
      </h1>

      <div className="mt-4 space-y-2.5">
        {loading ? (
          <div className="py-6 text-center text-sm text-night-800/40 animate-pulse">
            Syncing account garage configurations…
          </div>
        ) : vehicles.length === 0 ? (
          <p className="text-sm py-2 text-night-800/40">
            No vehicles configured on this profile yet.
          </p>
        ) : (
          vehicles.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-xl2 bg-white border border-gray-100 p-3.5 shadow-card transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-gray-50 shrink-0">
                  {getVehicleIcon(v.vehicle_type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-night-900 capitalize truncate">
                      {v.nickname || v.vehicle_type}
                    </p>
                    {v.is_default && (
                      <span className="rounded-full bg-signal-green/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-signal-green shrink-0">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono font-medium mt-0.5 text-night-800/50 uppercase tracking-wide">
                    {v.plate_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeVehicle(v.id)}
                disabled={deletingId !== null}
                className="p-1.5 rounded-lg text-signal-red/70 hover:text-signal-red hover:bg-signal-red/5 transition-colors focus:outline-none"
                title="Remove vehicle"
              >
                {deletingId === v.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-signal-red/50" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={addVehicle}
        className="mt-6 space-y-3.5 rounded-xl2 border border-gray-100 bg-white p-4 shadow-card"
      >
        <p className="text-sm font-bold text-night-900 flex items-center gap-1">
          <Plus size={16} /> Add a new vehicle
        </p>

        <div>
          <label htmlFor="vehicle-nickname" className="sr-only">
            Vehicle Nickname (optional)
          </label>
          <input
            id="vehicle-nickname"
            placeholder="Nickname (e.g., Grey Sedan)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={submitting}
            className="w-full rounded-xl border border-night-900/10 px-4 py-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-night-800/10 disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="vehicle-plate" className="sr-only">
            Plate Number
          </label>
          <input
            id="vehicle-plate"
            required
            placeholder="Plate number (e.g., BA 3 PA 1234)"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            disabled={submitting}
            className="w-full rounded-xl border border-night-900/10 px-4 py-3 bg-white text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-night-800/10 disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="vehicle-type" className="sr-only">
            Select Vehicle Type
          </label>
          <select
            id="vehicle-type"
            value={type}
            onChange={(e) => setType(e.target.value as VehicleType)}
            disabled={submitting}
            className="w-full rounded-xl border border-night-900/10 px-4 py-3 bg-white text-sm capitalize focus:outline-none focus:ring-2 focus:ring-night-800/10 disabled:opacity-60"
          >
            {vehicleTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-xs font-semibold text-signal-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !plate}
          className="w-full rounded-xl bg-night-800 py-3 text-sm font-semibold text-white transition hover:bg-night-900 disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving to garage...
            </>
          ) : (
            "Add vehicle"
          )}
        </button>
      </form>
    </div>
  );
}