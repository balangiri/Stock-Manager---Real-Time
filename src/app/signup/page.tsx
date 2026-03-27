"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Eye, EyeOff, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createSupabaseBrowserClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled in Supabase, sign the user in directly
    const { data: session } = await supabase.auth.getSession();
    if (session?.session) {
      router.push("/");
      router.refresh();
      return;
    }

    // Otherwise, show confirmation message
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "var(--background)" }}
      >
        <header
          className="border-b"
          style={{
            background: "var(--header-bg)",
            borderColor: "var(--header-border)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <div>
                <h1
                  className="text-xl font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  Stock Intel
                </h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div
            className="w-full max-w-sm rounded-2xl border p-8 shadow-sm text-center"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
          >
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Check your email
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              We sent a confirmation link to <strong>{email}</strong>. Click it
              to activate your account and sign in.
            </p>
            <a
              href="/login"
              className="text-sm text-blue-500 hover:underline font-medium"
            >
              Back to sign in
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Header */}
      <header
        className="border-b"
        style={{
          background: "var(--header-bg)",
          borderColor: "var(--header-border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div>
              <h1
                className="text-xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                Stock Intel
              </h1>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                AI-powered stock intelligence
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-sm rounded-2xl border p-8 shadow-sm"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--card-border)",
          }}
        >
          <h2
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--foreground)" }}
          >
            Create account
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            Start tracking your personal watchlist
          </p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  background: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 pr-10 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    background: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--foreground)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted)" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  background: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create account
            </button>
          </form>

          <p
            className="text-sm text-center mt-6"
            style={{ color: "var(--muted)" }}
          >
            Already have an account?{" "}
            <a
              href="/login"
              className="text-blue-500 hover:underline font-medium"
            >
              Sign in
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
