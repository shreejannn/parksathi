import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/home");

  return (
    <div className="min-h-screen bg-paper pb-10">
      <AdminNav />
      <div className="mx-auto max-w-3xl px-4 pt-5">{children}</div>
    </div>
  );
}
