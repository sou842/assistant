"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Bot } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register");
      }

      // Automatically sign in after registration
      await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      router.push("/ai");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-black text-white selection:bg-white/30 font-sans overflow-hidden">
      {/* Background Gradients & Grid */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-200 h-125 bg-white/2 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <Link href="/" className="fixed top-4 left-6 z-50 text-center flex items-center gap-2 cursor-pointer">
        <Bot className="size-5 text-white" />
        <span className="text-lg font-medium tracking-tight text-white">Jarvis</span>
      </Link>

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 pt-16">
        <div className="w-full max-w-90">
          <div className="text-center mb-8">
            <h2 className="text-[28px] font-medium tracking-tight text-white">
              Create your account
            </h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-sm text-red-200 text-center">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  className="block w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <input
                  type="email"
                  required
                  className="block w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="block w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center rounded-xl bg-[#EDEDED] px-4 py-3 text-sm font-medium text-black transition-all hover:bg-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Creating account..." : "Continue with Email"}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[#111] hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-offset-2 focus:ring-offset-black"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36 16.6053 6.54998L20.0303 3.125C17.9503 1.19 15.2353 0 12.0003 0C7.31028 0 3.25528 2.69 1.28027 6.60998L5.27028 9.70498C6.21528 6.71 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21538 17.285 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
              </svg>
              Sign up with Google
            </button>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[#111] hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Sign up with GitHub
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            Already have an account?
            <Link href="/login" className="inline ml-1.5 font-semibold text-white hover:text-gray-300 transition-colors cursor-pointer">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
