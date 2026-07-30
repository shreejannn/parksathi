"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import type { Profile } from "@/types";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Clock,
  Loader2,
  FileImage,
} from "lucide-react";
import toast from "react-hot-toast";

export default function VerificationPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (fetchError) throw fetchError;

        if (isMounted && data) {
          const p = data as Profile;
          setProfile(p);
          setFullName(p.full_name ?? "");
          setDob(p.date_of_birth ?? "");
          setLicenseNumber(p.license_number ?? "");
        }
      } catch (err: any) {
        console.error("Failed to sync profile identity mapping:", err.message);
        toast.error("Could not sync profile data.");
      } finally {
        if (isMounted) setPageLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Your session has timed out.");
        router.push("/login");
        return;
      }

      // 1. Guard Rule: Enforce an Age constraint (Minimum 18 Years Old)
      if (dob) {
        const birthDate = new Date(dob);
        const legalAgeLimit = new Date();
        legalAgeLimit.setFullYear(legalAgeLimit.getFullYear() - 18);

        if (birthDate > legalAgeLimit) {
          const msg =
            "You must be at least 18 years old to verify your identity.";
          setError(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }
      }

      let licensePhotoUrl = profile?.license_photo_url ?? null;

      // 2. Guard Rule: Process asset uploads securely if a new file is specified
      if (licenseFile) {
        // Enforce 5MB upload size safety boundary
        if (licenseFile.size > 5 * 1024 * 1024) {
          const msg = "The uploaded asset exceeds our 5MB file size limit.";
          setError(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }

        const ext = licenseFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/license_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("licenses")
          .upload(path, licenseFile, { upsert: true });

        if (uploadError) {
          throw new Error(`Storage upload failure: ${uploadError.message}`);
        }

        const { data: publicUrl } = supabase.storage
          .from("licenses")
          .getPublicUrl(path);
        licensePhotoUrl = publicUrl.publicUrl;
      }

      if (!licensePhotoUrl) {
        const msg = "Please upload a photo of your driving license.";
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      // 3. High Performance Optimization: Single-pass update mapping
      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          date_of_birth: dob || null,
          license_number: licenseNumber.trim() || null,
          license_photo_url: licensePhotoUrl,
          verification_status: "pending",
          verification_submitted_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setSuccess(true);
      toast.success("Verification materials submitted for review!");
      if (updatedProfile) setProfile(updatedProfile as Profile);
    } catch (err: any) {
      console.error("Critical submission runtime exception:", err);
      setError(err.message ?? "An unexpected transaction error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="p-12 text-center text-sm font-medium text-night-800/40 animate-pulse">
        Loading identity matrix configurations…
      </div>
    );
  }

  // Security Lockout Guard: Protect both pending and verified production pipelines
  const isLocked =
    profile?.verification_status === "pending" ||
    profile?.verification_status === "verified";

  return (
    <div className="px-4 pt-5 pb-10 max-w-md mx-auto">
      <h1 className="font-display text-xl font-semibold text-night-900">
        Identity verification
      </h1>
      <p className="mt-1 text-sm text-night-800/50 leading-relaxed">
        Verified accounts are trusted more by hosts and drivers within the
        ecosystem.
      </p>

      {profile && (
        <StatusCard
          status={profile.verification_status}
          notes={profile.verification_notes}
        />
      )}

      {isLocked ? (
        <div className="mt-6 rounded-xl2 bg-white border border-gray-100 p-4.5 text-sm text-night-800/70 shadow-card leading-relaxed">
          {profile?.verification_status === "pending" ? (
            <p>
              Your identity details are currently being reviewed by our
              compliance team. We will alert you via notifications as soon as
              verification completes.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="font-bold text-signal-green">
                Your account is fully authorized.
              </p>
              <p className="text-xs text-night-800/40">
                To update your verified legal identity details, please contact
                corporate support.
              </p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field id="verif-name" label="Full legal name">
            <input
              id="verif-name"
              required
              disabled={loading}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-night-800/10 disabled:opacity-60"
            />
          </Field>

          <Field id="verif-dob" label="Date of birth">
            <input
              id="verif-dob"
              type="date"
              required
              disabled={loading}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-night-800/10 disabled:opacity-60"
            />
          </Field>

          <Field id="verif-license" label="License number">
            <input
              id="verif-license"
              required
              disabled={loading}
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g. DL-1928394"
              className="w-full rounded-xl border border-night-900/10 bg-white px-4 py-3 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-night-800/10 disabled:opacity-60"
            />
          </Field>

          <Field
            id="verif-file"
            label={
              profile?.license_photo_url
                ? "Replace license asset document"
                : "License document photo"
            }
          >
            <div className="mt-1 flex flex-col gap-2">
              <input
                id="verif-file"
                type="file"
                accept="image/*"
                required={!profile?.license_photo_url}
                disabled={loading}
                onChange={(e) => setLicenseFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-night-800/60 file:mr-3 file:rounded-xl file:border-0 file:bg-night-800 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-white file:hover:bg-night-900 file:transition file:cursor-pointer disabled:opacity-50"
              />
              <p className="text-[10px] text-night-800/40">
                Supported formats: JPEG, PNG. Max size: 5MB.
              </p>

              {profile?.license_photo_url && !licenseFile && (
                <a
                  href={profile.license_photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 self-start flex items-center gap-1 text-xs font-semibold text-night-800/50 hover:text-night-900 underline transition"
                >
                  <FileImage size={14} />
                  View uploaded verification photo
                </a>
              )}
            </div>
          </Field>

          {error && (
            <p className="text-xs font-semibold text-signal-red animate-shake">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs font-bold text-signal-green">
              Profile updated successfully!
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-night-800 py-3 text-sm font-semibold text-white transition hover:bg-night-900 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading document portfolio...
              </>
            ) : (
              "Submit details for verification"
            )}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-semibold text-night-800/70"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function StatusCard({
  status,
  notes,
}: {
  status: string;
  notes: string | null;
}) {
  const config: Record<
    string,
    { icon: React.ReactNode; text: string; bg: string; border: string }
  > = {
    unverified: {
      icon: <ShieldQuestion className="h-5 w-5 text-night-800/50" />,
      text: "Identity documentation verification required.",
      bg: "bg-white",
      border: "border-gray-100",
    },
    pending: {
      icon: <Clock className="h-5 w-5 text-signal-amber" />,
      text: "Identity metadata pending verification authorization.",
      bg: "bg-signal-amber/5",
      border: "border-signal-amber/10",
    },
    verified: {
      icon: <ShieldCheck className="h-5 w-5 text-signal-green" />,
      text: "Your profile is verified.",
      bg: "bg-signal-green/5",
      border: "border-signal-green/10",
    },
    rejected: {
      icon: <ShieldAlert className="h-5 w-5 text-signal-red" />,
      text: notes
        ? `Rejected: ${notes}`
        : "Identity request declined. Please verify inputs.",
      bg: "bg-signal-red/5",
      border: "border-signal-red/10",
    },
  };

  const c = config[status] ?? config.unverified;

  return (
    <div
      className={`mt-4 flex items-start gap-3 rounded-xl2 border p-4 shadow-card transition-all ${c.bg} ${c.border}`}
    >
      <div className="mt-0.5 shrink-0">{c.icon}</div>
      <p className="text-sm font-medium text-night-900 leading-normal">
        {c.text}
      </p>
    </div>
  );
}
