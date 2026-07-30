import { createClient } from "@/lib/supabaseServer";
import BottomNav from "@/components/BottomNav";
import OneSignalInit from "@/components/OneSignalInit";
import { redirect } from "next/navigation";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper">
      <OneSignalInit userId={user.id} />
      <div className="min-h-0 flex-1 overflow-y-auto pb-20">{children}</div>
      <BottomNav unreadCount={count ?? 0} />
    </div>
  );
}
