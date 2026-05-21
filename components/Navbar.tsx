"use client";

import Link from 'next/link';
import { Bot, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="w-full max-w-300 mx-auto border-l border-r border-white/10 px-4 md:px-8">
        <div className="mx-auto max-w-6xl h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Bot className="size-5 text-white" />
            <span className="text-base font-medium tracking-tight text-white">Jarvis</span>
          </Link>
          <div className="flex items-center gap-6">
            {status === "loading" ? (
              <div className="h-8 w-32 animate-pulse rounded-full bg-white/5" />
            ) : session ? (
              <Link
                href="/ai"
                className="flex items-center gap-2 text-sm font-medium bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-200 transition-colors group"
              >
                Start
                <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium bg-white text-black px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
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
