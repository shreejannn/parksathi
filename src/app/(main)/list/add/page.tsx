"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import clsx from "clsx";
import type { ParkingMode } from "@/types";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

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

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    await supabase.from("profiles").update({ is_host: true }).eq("id", user.id);

    router.push("/list");
  }

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="font-display text-xl font-semibold text-night-900">
        Add your parking spot
      </h1>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-night-800/60">
            Spot name
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Driveway near Baneshwor chowk"
            className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-night-800/60">
            Address
          </label>
          <input
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-night-800/60">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-night-800/60">
            Pin the exact location (tap the map)
          </label>
          <LocationPicker value={loc} onChange={setLoc} />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-night-800/60">
            Parking mode
          </label>
          <div className="flex gap-2">
            <ModeButton
              active={mode === "credit"}
              onClick={() => setMode("credit")}
              label="🅿️ Credit (community)"
            />
            <ModeButton
              active={mode === "commercial"}
              onClick={() => setMode("commercial")}
              label="💰 Commercial (paid)"
            />
          </div>
        </div>

        {mode === "credit" ? (
          <NumberField
            label="Credits charged per hour"
            value={creditPerHour}
            onChange={setCreditPerHour}
            min={1}
          />
        ) : (
          <NumberField
            label="Price per hour (Rs.)"
            value={pricePerHour}
            onChange={setPricePerHour}
            min={0}
          />
        )}

        <NumberField
          label="Total slots available"
          value={totalSlots}
          onChange={setTotalSlots}
          min={1}
        />

        {error && <p className="text-sm text-signal-red">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-night-800 py-3 font-semibold text-white disabled:opacity-60"
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
        "flex-1 rounded-xl border px-3 py-3 text-sm font-medium",
        active
          ? "border-night-800 bg-night-800 text-white"
          : "border-night-900/10 bg-white text-night-800/60"
      )}
    >
      {label}
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-night-800/60">{label}</label>
      <input
        type="number"
        min={min}
        required
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3"
      />
    </div>
  );
}
