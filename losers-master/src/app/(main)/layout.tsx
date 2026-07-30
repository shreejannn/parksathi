import { createClient } from "@/lib/supabaseServer";
import BottomNav from "@/components/BottomNav";
import OneSignalInit from "@/components/OneSignalInit";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default async function MainLayout({ children }: MainLayoutProps) {
  const supabase = createClient();

  // Authenticate user session down to the edge database layer
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  let unreadNotificationCount = 0;

  try {
    // Perform a lightweight exact-count head query to minimize network load
    const { count, error: countError } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (countError) throw countError;
    if (count !== null) unreadNotificationCount = count;
  } catch (err) {
    // Log exception safely without throwing a blocking application error shell
    console.error(
      "Failed to accurately read system notification metrics:",
      err,
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-paper select-none">
      {/* Initialize push registration profiles out-of-band */}
      <OneSignalInit userId={user.id} />

      {/* Primary content scroll container */}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain focus:outline-none">
        <div className="mx-auto min-h-full pb-24">{children}</div>
      </main>

      {/* 
        Pass server count down as an explicit baseline initialization seed.
        Note: BottomNav should use this value to seed internal state and 
        listen to Supabase Realtime channels for subsequent mutations.
      */}
      <BottomNav initialUnreadCount={unreadNotificationCount} />
    </div>
  );
}
