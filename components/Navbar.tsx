"use client";

import Link from 'next/link';
import { Bot, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/50 to-transparent">
      <div className="w-full max-w-300 mx-auto px-4 md:px-8">
        <div className="mx-auto max-w-6xl h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
            <Bot className="size-5" />
            <span className="text-base font-medium tracking-tight">Jarvis</span>
          </Link>
          <div className="flex items-center gap-6">
            {/* <Link href="/articles" className="text-sm text-white/70 transition-colors hover:text-white hidden md:block">
              Articles
            </Link> */}
            {status === "loading" ? (
              <div className="h-8 w-32 animate-pulse rounded-full bg-app-surface-glass" />
            ) : session ? (
              <Link
                href="/ai"
                className="flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition-colors group hover:bg-white/90 shadow-sm"
              >
                Start
                <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-white/70 transition-colors hover:text-white">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-white/90 shadow-sm"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
