"use client";

import Link from 'next/link';
import { Bot, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-app-border-default bg-app-canvas/40 backdrop-blur-xl">
      <div className="w-full max-w-300 mx-auto border-l border-r border-app-border-default px-4 md:px-8">
        <div className="mx-auto max-w-6xl h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Bot className="size-5 text-app-text-primary" />
            <span className="text-base font-medium tracking-tight text-app-text-primary">Jarvis</span>
          </Link>
          <div className="flex items-center gap-6">
            {status === "loading" ? (
              <div className="h-8 w-32 animate-pulse rounded-full bg-app-surface-glass" />
            ) : session ? (
              <Link
                href="/ai"
                className="flex items-center gap-2 rounded-full bg-app-primary px-4 py-1.5 text-sm font-medium text-app-primary-foreground transition-colors group hover:bg-app-primary-hover"
              >
                Start
                <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-app-text-muted transition-colors hover:text-app-text-primary">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-app-primary px-3 py-1.5 text-sm font-medium text-app-primary-foreground transition-colors hover:bg-app-primary-hover"
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
