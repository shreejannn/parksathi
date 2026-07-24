"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!licenseFile) {
      setError("Please upload a photo of your driving license.");
      return;
    }
    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });

    if (signUpError || !signUpData.user) {
      setLoading(false);
      setError(signUpError?.message ?? "Could not create account.");
      return;
    }

    const userId = signUpData.user.id;
    const ext = licenseFile.name.split(".").pop();
    const path = `${userId}/license.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("licenses")
      .upload(path, licenseFile, { upsert: true });

    if (uploadError) {
      setLoading(false);
      setError(`Account created, but license upload failed: ${uploadError.message}`);
      return;
    }

    const { data: publicUrl } = supabase.storage.from("licenses").getPublicUrl(path);

    await supabase
      .from("profiles")
      .update({ phone, license_photo_url: publicUrl.publicUrl })
      .eq("id", userId);

    setLoading(false);
    router.push("/home");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-night-900 px-6 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 font-display text-2xl font-semibold text-white">
          Create your ParkSathi account
        </h1>

        <form onSubmit={handleSignup} className="space-y-4">
          <Field label="Full name">
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="Hari Bahadur"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </Field>

          <Field label="Phone number (required)">
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="98XXXXXXXX"
            />
          </Field>

          <Field label="Driving license photo (required)">
            <input
              type="file"
              accept="image/*"
              required
              onChange={(e) => setLicenseFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-signal-amber file:px-3 file:py-2 file:text-night-900 file:font-medium"
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </Field>

          <Field label="Confirm password">
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </Field>

          {error && <p className="text-sm text-signal-red">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-signal-amber py-3 font-semibold text-night-900 transition hover:brightness-95 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-white/60">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-signal-amber">
            Log in
          </Link>
        </p>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          padding: 0.75rem 1rem;
          color: white;
          outline: none;
        }
        .input:focus {
          border-color: #ffc94a;
        }
        .input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-white/70">{label}</label>
      {children}
    </div>
  );
}
