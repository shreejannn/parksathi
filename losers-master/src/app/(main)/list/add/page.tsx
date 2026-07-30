"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import clsx from "clsx";
import type { ParkingMode } from "@/types";
import toast from "react-hot-toast";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 rounded-xl bg-gray-100 flex items-center justify-center text-xs text-night-800/40 animate-pulse">
      Loading interactive map configuration…
    </div>
  ),
});

export default function AddSpotPage() {
  const supabase = createClient();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [mode, setMode] = useState<ParkingMode>("credit");
  const [pricePerHour, setPricePerHour] = useState(20);
  const [creditPerHour, setCreditPerHour] = useState(1);
  const [totalSlots, setTotalSlots] = useState(1);
  const [loc, setLoc] = useState({ lat: 27.7172, lng: 85.324 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const msg = "You must be logged in to list a parking spot.";
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      // Step 1: Create the new parking spot record
      const { error: insertError } = await supabase.from("parking_spots").insert({
        host_id: user.id,
        title,
        description,
        address,
        mode,
        price_per_hour: mode === "commercial" ? pricePerHour : 0,
        credit_per_hour: mode === "credit" ? creditPerHour : 0,
        latitude: loc.lat,
        longitude: loc.lng,
        total_slots: totalSlots,
        available_slots: totalSlots,
      });

      if (insertError) throw insertError;

      // Step 2: Elevate profile privileges to host status safely
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_host: true })
        .eq("id", user.id);

      if (profileError) throw profileError;

      toast.success("Parking spot published successfully!");
      router.push("/list");
    } catch (err: any) {
      console.error("Failed to register listing profiles:", err);
      const errMsg = err?.message ?? "An unexpected setup error occurred.";
      setError(errMsg);
      toast.error(errMsg);
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="font-display text-xl font-semibold text-night-900">
        Add your parking spot
      </h1>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="spot-title" className="mb-1 block text-xs font-medium text-night-800/60">
            Spot name
          </label>
          <input
            id="spot-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Driveway near Baneshwor chowk"
            className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-night-800/10"
          />
        </div>

        <div>
          <label htmlFor="spot-address" className="mb-1 block text-xs font-medium text-night-800/60">
            Address
          </label>
          <input
            id="spot-address"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Kathmandu, Nepal"
            className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-night-800/10"
          />
        </div>

        <div>
          <label htmlFor="spot-description" className="mb-1 block text-xs font-medium text-night-800/60">
            Description (optional)
          </label>
          <textarea
            id="spot-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Provide custom instructions, gate rules, or landmarks..."
            className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-night-800/10"
          />
        </div>

        <div>
          <span className="mb-2 block text-xs font-medium text-night-800/60">
            Pin the exact location (tap the map)
          </span>
          <LocationPicker value={loc} onChange={setLoc} />
        </div>

        <div>
          <span className="mb-2 block text-xs font-medium text-night-800/60">
            Parking mode
          </span>
          <div className="flex gap-2">
            <ModeButton
              active={mode === "credit"}
              onClick={() => setMode("credit")}
              label="Credit (community)"
            />

            <ModeButton
              active={mode === "commercial"}
              onClick={() => setMode("commercial")}
              label="Commercial (paid)"
            />
          </div>
        </div>

        {mode === "credit" ? (
          <NumberField
            id="spot-credits"
            label="Credits charged per hour"
            value={creditPerHour}
            onChange={setCreditPerHour}
            min={1}
          />
        ) : (
          <NumberField
            id="spot-price"
            label="Price per hour (Rs.)"
            value={pricePerHour}
            onChange={setPricePerHour}
            min={0}
          />
        )}

        <NumberField
          id="spot-slots"
          label="Total slots available"
          value={totalSlots}
          onChange={setTotalSlots}
          min={1}
        />

        {error && <p className="text-sm font-medium text-signal-red">{error}</p>}

        <p className="text-xs text-night-800/40 leading-relaxed">
          New spots go live once our team verifies them — usually within a day.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-night-800 py-3 font-semibold text-white transition hover:bg-night-900 disabled:opacity-60 active:scale-[0.99]"
        >
          {loading ? "Publishing…" : "Publish spot"}
        </button>
      </form>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex-1 rounded-xl border px-3 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-night-800/20",
        active
          ? "border-night-800 bg-night-800 text-white"
          : "border-night-900/10 bg-white text-night-800/60 hover:bg-gray-50",
      )}
    >
      {label}
    </button>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-night-800/60">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        required
        value={value === 0 && min > 0 ? "" : value}
        onChange={(e) => {
          const rawValue = e.target.value;
          // Gracefully default to the minimum parameter if value cleared entirely
          onChange(rawValue === "" ? min : Math.max(min, Number(rawValue)));
        }}
        className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-night-800/10"
      />
    </div>
  );
}