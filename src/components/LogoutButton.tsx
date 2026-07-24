"use client";

import { createClient } from "@/lib/supabaseClient";

export default function LogoutButton() {
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full rounded-xl border border-signal-red/30 py-3 text-sm font-semibold text-signal-red"
    >
      Log out
    </button>
  );
}
