"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import type { ParkingSpot } from "@/types";

// Leaflet's default marker icons reference files that don't bundle correctly
// with webpack — rebuild them from the CDN instead.
const spotIcon = (mode: "credit" | "commercial", available: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      background:${available ? (mode === "credit" ? "#6cd651" : "#FFC94A") : "#9AA5B1"};
      border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);
      font-size:16px;">
      ${mode === "credit" ? "🅿️" : "💰"}
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

const meIcon = L.divIcon({
  className: "",
  html: `<div class="pulse-dot"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

export default function MapView({ spots }: { spots: ParkingSpot[] }) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setPos({ lat: 27.7172, lng: 85.324 }) // fallback: Kathmandu
    );
  }, []);

  const center = useMemo(
    () => pos ?? { lat: 27.7172, lng: 85.324 },
    [pos]
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {pos && (
        <>
          <Recenter lat={pos.lat} lng={pos.lng} />
          <Marker position={[pos.lat, pos.lng]} icon={meIcon}>
            <Popup>You are here</Popup>
          </Marker>
        </>
      )}

      {spots.map((s) => (
        <Marker
          key={s.id}
          position={[s.latitude, s.longitude]}
          icon={spotIcon(s.mode, s.available_slots > 0)}
        >
          <Popup>
            <div className="min-w-[170px]">
              <p className="font-semibold">{s.title}</p>
              <p className="text-xs text-night-800/60">{s.address}</p>
              <p className="mt-1 text-xs">
                {s.mode === "credit"
                  ? `${s.credit_per_hour} credit/hr`
                  : `Rs. ${s.price_per_hour}/hr`}
                {" · "}
                {s.available_slots}/{s.total_slots} free
              </p>
              <Link
                href={`/booking/${s.id}`}
                className="mt-2 inline-block rounded-lg bg-night-800 px-3 py-1.5 text-xs font-medium text-white"
              >
                Reserve
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
