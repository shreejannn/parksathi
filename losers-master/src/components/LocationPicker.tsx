"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { MapPin } from "lucide-react";

const pinIcon = L.divIcon({
  className: "",
  html: renderToStaticMarkup(
    <MapPin size={32} color="#EF5B5B" fill="#EF5B5B" strokeWidth={1.5} />,
  ),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number };
  onChange: (v: { lat: number; lng: number }) => void;
}) {
  const [center, setCenter] = useState(value);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      const c = { lat: p.coords.latitude, lng: p.coords.longitude };
      setCenter(c);
      onChange(c);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-56 w-full overflow-hidden rounded-xl">
      <MapContainer center={[center.lat, center.lng]} zoom={16} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickCatcher onPick={(lat, lng) => onChange({ lat, lng })} />
        <Marker position={[value.lat, value.lng]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}
