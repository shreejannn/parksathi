"use client";

import OneSignal from "react-onesignal";

let initialized = false;

/**
 * Initializes OneSignal web push exactly once per browser session.
 * Call this from a top-level client component (see AppShell).
 */
export async function initOneSignal(externalUserId?: string) {
  if (initialized || typeof window === "undefined") return;
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) return;

  await OneSignal.init({
    appId,
    allowLocalhostAsSecureOrigin: true,
  });

  initialized = true;

  if (externalUserId) {
    await OneSignal.login(externalUserId);
  }
}

export async function loginOneSignal(userId: string) {
  if (!initialized) return;
  await OneSignal.login(userId);
}
