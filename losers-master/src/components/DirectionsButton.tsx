"use client";

import { Navigation } from "lucide-react";
import { getDirectionsUrl } from "@/lib/directions";
import clsx from "clsx";

export default function DirectionsButton({
  lat,
  lng,
  variant = "solid",
  className,
}: {
  lat: number;
  lng: number;
  variant?: "solid" | "outline";
  className?: string;
}) {
  return (
    <a
      href={getDirectionsUrl(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        "flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold transition",
        variant === "solid"
          ? "bg-night-800 text-white"
          : "border border-night-900/15 bg-white text-night-800",
        className,
      )}
    >
      <Navigation className="h-4 w-4 text-[#ffc948]" />
      Get there
    </a>
  );
}
