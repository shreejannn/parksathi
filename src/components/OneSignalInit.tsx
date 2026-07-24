"use client";

import { useEffect } from "react";
import { initOneSignal } from "@/lib/onesignal";

export default function OneSignalInit({ userId }: { userId: string }) {
  useEffect(() => {
    initOneSignal(userId);
  }, [userId]);

  return null;
}
