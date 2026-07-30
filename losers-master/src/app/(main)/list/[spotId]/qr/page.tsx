"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import type { ParkingSpot } from "@/types";
import { Printer, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function SpotQrPage() {
  const supabase = createClient();
  const { spotId } = useParams<{ spotId: string }>();
  
  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchSpot() {
      try {
        setLoading(true);
        setError(false);
        
        const { data, error: fetchError } = await supabase
          .from("parking_spots")
          .select("*")
          .eq("id", spotId)
          .single();

        if (fetchError) throw fetchError;

        if (isMounted && data) {
          setSpot(data as ParkingSpot);
        }
      } catch (err) {
        console.error("Error fetching spot QR profile:", err);
        if (isMounted) setError(true);
        toast.error("Could not load the QR data for this spot.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (spotId) {
      fetchSpot();
    }

    return () => {
      isMounted = false;
    };
  }, [spotId, supabase]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-center text-night-800/40">
        <span className="text-sm font-medium animate-pulse">Generating secure link…</span>
      </div>
    );
  }

  if (error || !spot) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center text-night-800/60">
        <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
        <p className="text-sm font-medium">Failed to generate QR code page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 pt-8 pb-12 text-center print:pt-0 print:pb-0">
      {/* Dynamic Print Container Profile */}
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card border border-night-900/5 print:border-none print:shadow-none">
        <h1 className="font-display text-xl font-bold text-night-900 print:text-2xl">
          {spot.title}
        </h1>
        
        <p className="mt-2 mb-6 text-sm text-night-800/50 print:text-night-900 print:font-medium">
          Scan to start or end your parking session.
        </p>
        
        {/* Centered QR wrapper ensuring proper print sizing */}
        <div className="flex justify-center bg-white p-4 rounded-xl border border-gray-100 print:border-none">
          <QRCodeDisplay value={spot.qr_secret} size={240} />
        </div>
        
        <p className="mt-4 font-mono text-xs text-night-800/40 select-all print:text-black">
          Spot Identifier: {spot.qr_secret}
        </p>
      </div>

      {/* Control panel hidden automatically during physical or PDF printing */}
      <div className="mt-6 w-full max-w-md print:hidden">
        <p className="mb-4 text-xs text-night-800/50 px-4">
          Print this sheet out on durable paper and display it clearly at the parking location. 
          Drivers use their phone cameras or the Park Sathi application to check in.
        </p>
        
        <button
          onClick={handlePrint}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-night-800 py-3 font-semibold text-white transition hover:bg-night-900 active:scale-[0.98]"
        >
          <Printer size={18} />
          Print Code Sheet
        </button>
      </div>
    </div>
  );
}