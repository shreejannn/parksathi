"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { AppNotification } from "@/types";
import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data as AppNotification[]) ?? []);
    } catch (err) {
      console.error("Failed to pull account notifications:", err);
      toast.error("Could not sync your notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    
    if (isMounted) {
      load();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  async function markRead(id: string) {
    const target = items.find((n) => n.id === id);
    // If the notification is already read, do not trigger database overhead
    if (!target || target.is_read) return;

    // Optimistic local state adjustment for zero latency
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      console.error("Failed to commit status write:", error.message);
      // Revert states cleanly if remote save fails
      load();
    }
  }

  async function markAllAsRead() {
    const unreadItems = items.filter((n) => !n.is_read);
    if (unreadItems.length === 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) return;

    // Local optimistic update
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Batch update failed:", error.message);
      toast.error("Failed to update all items.");
      load();
    } else {
      toast.success("All marked as read");
    }
  }

  const hasUnread = items.some((n) => !n.is_read);

  return (
    <div className="px-4 pt-5 pb-12">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl font-semibold text-night-900">
          Notifications
        </h1>
        {items.length > 0 && hasUnread && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-xs font-semibold text-night-800/60 hover:text-night-900 transition"
          >
            <CheckCircle2 size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <div className="mt-10 text-center text-sm text-night-800/40 animate-pulse">
            Syncing notification center…
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-night-800/40">
            {/* Fixed the truncated text hash syntax utility string below */}
            <BellOff className="mb-2 h-8 w-8 text-[#282c34]" />
            <p className="text-sm">You&apos;re all caught up.</p>
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              disabled={n.is_read}
              className={clsx(
                "flex w-full items-start gap-3 rounded-xl2 p-3 text-left transition shadow-card focus:outline-none focus:ring-2 focus:ring-night-800/5",
                n.is_read 
                  ? "bg-white border border-gray-100 opacity-75 cursor-default" 
                  : "bg-signal-amber/10 border border-signal-amber/5 hover:bg-signal-amber/15",
              )}
            >
              <Bell 
                className={clsx(
                  "mt-0.5 h-5 w-5 shrink-0 transition-colors", 
                  n.is_read ? "text-night-800/30" : "text-[#ffc948]"
                )} 
              />
              <div className="min-w-0 flex-1">
                <p className={clsx("text-sm text-night-900", !n.is_read ? "font-semibold" : "font-medium")}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs mt-0.5 text-night-800/60 leading-normal">{n.body}</p>
                )}
                <time className="mt-1.5 block text-[10px] font-medium text-night-800/40">
                  {new Date(n.created_at).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </time>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}