"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Navbar from "@/components/Navbar";
import { Bot } from "lucide-react";
import Footer from "@/components/Footer";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError("Invalid email or password");
      } else {
        window.location.href = "/ai";
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-page-shell app-selection">
      {/* Background Gradients & Grid */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className="app-hero-glow absolute top-0 left-1/2 h-125 w-full max-w-200 -translate-x-1/2 rounded-full blur-[120px]" />
        <div className="app-grid-overlay absolute inset-0" />
      </div>

      <Link href="/" className="fixed top-4 left-6 z-50 text-center flex items-center gap-2 cursor-pointer">
        <Bot className="size-5 text-app-text-primary" />
        <span className="text-lg font-medium tracking-tight text-app-text-primary">Jarvis</span>
      </Link>

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 pt-16">
        <div className="w-full max-w-90">
          <div className="text-center mb-8">
            <h2 className="text-[28px] font-medium tracking-tight text-app-text-primary">
              Welcome back
            </h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl border border-app-danger-border bg-app-danger-soft p-3">
                <p className="text-center text-sm text-app-danger-foreground">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <input
                  type="email"
                  required
                  className="block w-full rounded-xl border border-app-border-default bg-app-surface px-4 py-3 text-app-text-primary placeholder:text-app-text-muted transition-colors focus:border-app-border-strong focus:outline-none focus:ring-1 focus:ring-app-focus"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  className="block w-full rounded-xl border border-app-border-default bg-app-surface px-4 py-3 text-app-text-primary placeholder:text-app-text-muted transition-colors focus:border-app-border-strong focus:outline-none focus:ring-1 focus:ring-app-focus"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-xl bg-app-primary px-4 py-3 text-sm font-medium text-app-primary-foreground transition-all hover:bg-app-primary-hover focus:outline-none focus:ring-2 focus:ring-app-text-primary focus:ring-offset-2 focus:ring-offset-app-canvas disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Logging in..." : "Continue with Email"}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-app-border-default bg-app-surface px-4 py-3 text-sm font-medium text-app-text-primary transition-all hover:border-app-border-strong hover:bg-app-surface-hover focus:border-app-focus-accent focus:outline-none focus:ring-2 focus:ring-app-focus-accent focus:ring-offset-2 focus:ring-offset-app-canvas"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M12.0003 4.75C13.7703 4.75 15.3553 5.36 16.6053 6.54998L20.0303 3.125C17.9503 1.19 15.2353 0 12.0003 0C7.31028 0 3.25528 2.69 1.28027 6.60998L5.27028 9.70498C6.21528 6.71 8.87028 4.75 12.0003 4.75Z"
                  fill="#EA4335"
                />
                <path
                  d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                  fill="#4285F4"
                />
                <path
                  d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21538 17.285 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                  fill="#34A853"
                />
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-app-border-default bg-app-surface px-4 py-3 text-sm font-medium text-app-text-primary transition-all hover:border-app-border-strong hover:bg-app-surface-hover focus:outline-none focus:ring-2 focus:ring-app-text-primary focus:ring-offset-2 focus:ring-offset-app-canvas"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-app-text-muted">
            Don't have an account?
            <Link href="/register" className="inline ml-1.5 font-semibold text-app-text-primary transition-colors cursor-pointer hover:text-app-text-secondary">
              Sign up
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
