"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { AppNotification } from "@/types";
import { Bell, BellOff } from "lucide-react";
import clsx from "clsx";

export default function NotificationsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<AppNotification[]>([]);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as AppNotification[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    load();
  }

  return (
    <div className="px-4 pt-5">
      <h1 className="font-display text-xl font-semibold text-night-900">Notifications</h1>

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-night-800/40">
            <BellOff className="mb-2 h-8 w-8" />
            <p className="text-sm">You&apos;re all caught up.</p>
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={clsx(
                "flex w-full items-start gap-3 rounded-xl2 p-3 text-left shadow-card",
                n.is_read ? "bg-white" : "bg-signal-amber/10"
              )}
            >
              <Bell className="mt-0.5 h-5 w-5 shrink-0 text-night-800/50" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-night-900">{n.title}</p>
                {n.body && <p className="text-xs text-night-800/60">{n.body}</p>}
                <p className="mt-1 text-[10px] text-night-800/30">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
