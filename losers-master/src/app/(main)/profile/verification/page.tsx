"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import type { Profile } from "@/types";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Clock } from "lucide-react";

export default function VerificationPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const p = data as Profile;
      setProfile(p);
      setFullName(p?.full_name ?? "");
      setDob(p?.date_of_birth ?? "");
      setLicenseNumber(p?.license_number ?? "");
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    let licensePhotoUrl = profile?.license_photo_url ?? null;

    if (licenseFile) {
      const ext = licenseFile.name.split(".").pop();
      const path = `${user.id}/license.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("licenses")
        .upload(path, licenseFile, { upsert: true });

      if (uploadError) {
        setError(`Could not upload license photo: ${uploadError.message}`);
        setLoading(false);
        return;
      }
      const { data: publicUrl } = supabase.storage.from("licenses").getPublicUrl(path);
      licensePhotoUrl = publicUrl.publicUrl;
    }

    if (!licensePhotoUrl) {
      setError("Please upload a photo of your driving license.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        date_of_birth: dob || null,
        license_number: licenseNumber || null,
        license_photo_url: licensePhotoUrl,
        verification_status: "pending",
        verification_submitted_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data as Profile);
  }

  if (!profile) {
    return <div className="p-6 text-center text-night-800/40">Loading…</div>;
  }

  const locked = profile.verification_status === "pending";

  return (
    <div className="px-4 pt-5 pb-10">
      <h1 className="font-display text-xl font-semibold text-night-900">
        Identity verification
      </h1>
      <p className="mt-1 text-sm text-night-800/50">
        Verified accounts are trusted more by hosts and drivers.
      </p>

      <StatusCard status={profile.verification_status} notes={profile.verification_notes} />

      {locked ? (
        <p className="mt-6 rounded-xl2 bg-white p-4 text-sm text-night-800/60 shadow-card">
          Your details are being reviewed by our team. You&apos;ll get a notification once
          it&apos;s verified.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Full name">
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3"
            />
          </Field>

          <Field label="Date of birth">
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3"
            />
          </Field>

          <Field label="License number">
            <input
              required
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3"
            />
          </Field>

          <Field label={profile.license_photo_url ? "Replace license photo" : "License photo"}>
            <input
              type="file"
              accept="image/*"
              required={!profile.license_photo_url}
              onChange={(e) => setLicenseFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-night-800/70 file:mr-3 file:rounded-lg file:border-0 file:bg-night-800 file:px-3 file:py-2 file:font-medium file:text-white"
            />
            {profile.license_photo_url && !licenseFile && (
              <a
                href={profile.license_photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-night-800/50 underline"
              >
                View current photo
              </a>
            )}
          </Field>

          {error && <p className="text-sm text-signal-red">{error}</p>}
          {success && <p className="text-sm text-signal-green">Submitted for review!</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-night-800 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Submit for verification"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-night-800/60">{label}</label>
      {children}
    </div>
  );
}

function StatusCard({ status, notes }: { status: string; notes: string | null }) {
  const config: Record<string, { icon: React.ReactNode; text: string; bg: string }> = {
    unverified: {
      icon: <ShieldQuestion className="h-5 w-5 text-night-800/50" />,
      text: "You haven't submitted your verification yet.",
      bg: "bg-white",
    },
    pending: {
      icon: <Clock className="h-5 w-5 text-signal-amber" />,
      text: "Your verification is being reviewed.",
      bg: "bg-signal-amber/10",
    },
    verified: {
      icon: <ShieldCheck className="h-5 w-5 text-signal-green" />,
      text: "You're verified!",
      bg: "bg-signal-green/10",
    },
    rejected: {
      icon: <ShieldAlert className="h-5 w-5 text-signal-red" />,
      text: notes ? `Rejected: ${notes}` : "Your verification was rejected. Please resubmit.",
      bg: "bg-signal-red/10",
    },
  };
  const c = config[status] ?? config.unverified;

  return (
    <div className={`mt-4 flex items-center gap-3 rounded-xl2 p-4 shadow-card ${c.bg}`}>
      {c.icon}
      <p className="text-sm text-night-900">{c.text}</p>
    </div>
  );
}
