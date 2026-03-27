"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Eye, EyeOff, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

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
            Welcome back
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            Sign in to manage your stocks
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              Sign in
            </button>
          </form>

          <p
            className="text-sm text-center mt-6"
            style={{ color: "var(--muted)" }}
          >
            Don&apos;t have an account?{" "}
            <a
              href="/signup"
              className="text-blue-500 hover:underline font-medium"
            >
              Create one
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
