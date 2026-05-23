"use client";

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ClickSpark from '@/components/ClickSpark';
import { motion } from 'framer-motion';
import {
  Bot,
  Brain,
  Database,
  Lock,
  Calendar,
  ArrowUpRight
} from 'lucide-react';

export default function Home() {
  return (
    <main className="app-page-shell app-selection">
      <ClickSpark sparkColor="#ffffff" sparkSize={10} sparkRadius={20} sparkCount={10} duration={500} bindToWindow={true} />
      {/* Background Gradients & Grid */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className="app-hero-glow absolute top-0 left-1/2 h-125 w-full max-w-200 -translate-x-1/2 rounded-full blur-[120px] transform-gpu will-change-transform" />
        <div className="app-grid-overlay absolute inset-0" />
      </div>

      {/* Navigation */}
      <Navbar />

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="bg-[url('/images/hero.png')] bg-cover bg-center bg-no-repeat border-b border-app-border-default">
          <div className="w-full max-w-300 min-h-dvh mx-auto text-center flex flex-col items-center justify-center relative">
            <div className="w-full max-w-200 pt-16 pb-20 md:pt-20 md:pb-28 px-4 relative z-20">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-6 bg-app-text-primary bg-clip-text text-5xl font-medium tracking-tighter leading-20 text-transparent md:text-6xl"
              >
                The Intelligent OS for Your Digital Life
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-app-text-secondary"
              >
                Jarvis provides the AI capabilities and cloud infrastructure to build, scale, and automate a faster, more personalized workflow.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-4 justify-center"
              >
                <Link
                  href="/ai"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-app-primary px-6 py-2.5 font-medium text-app-primary-foreground transition-all duration-200 group hover:bg-app-primary-hover sm:w-auto"
                >
                  Start Chatting
                  <ArrowUpRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="#features"
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-app-border-strong bg-transparent px-6 py-2.5 font-medium text-app-text-primary transition-all duration-200 hover:bg-app-surface-glass sm:w-auto"
                >
                  View Features
                </a>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Hero Section Divider */}
        <div className="border-b border-app-border-default">
          <div className="w-full max-w-300 mx-auto py-16 border-l border-r border-app-border-default px-4 md:px-8 text-center">
          </div>
        </div>

        {/* Feature Grid (Bento Box) */}
        <div id="features" className="border-b border-app-border-default bg-app-canvas/20">
          <div className="w-full max-w-300 mx-auto border-l border-r border-app-border-default px-4 py-20 md:px-8 md:py-32">
            <div className="mx-auto max-w-6xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

                {/* Feature 1 - Large Top */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5 }}
                  className="group relative overflow-hidden rounded-3xl border border-app-border-subtle bg-app-surface-glass-faint p-8 transition-all duration-500 hover:border-app-border-default hover:bg-app-surface-glass-soft md:col-span-2 md:p-12 row-span-2"
                >
                  <div className="absolute top-0 right-0 h-[500px] w-[500px] translate-x-1/2 -translate-y-1/2 rounded-full bg-app-focus-accent/10 blur-[100px] opacity-0 transition-opacity duration-700 group-hover:opacity-100 transform-gpu will-change-transform" />
                  <Database className="mb-6 size-8 text-app-text-secondary" />
                  <h3 className="mb-3 text-2xl font-medium tracking-tight text-app-text-secondary">The Vault</h3>
                  <p className="max-w-md text-sm leading-relaxed text-app-text-muted md:text-base">
                    Natively store markdown notes, interactive spreadsheets, and media galleries. Your personal data is automatically organized and instantly retrievable by the AI whenever you need it.
                  </p>
                </motion.div>

                {/* Feature 2 - Small Top Right */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="group relative flex min-h-[240px] flex-col justify-end overflow-hidden rounded-3xl border border-app-border-subtle bg-app-surface-glass-faint p-8 transition-all duration-500 hover:border-app-border-default hover:bg-app-surface-glass-soft"
                >
                  <div className="absolute bottom-0 right-0 h-[200px] w-[200px] translate-x-1/4 translate-y-1/4 rounded-full bg-app-surface-glass blur-[50px] opacity-0 transition-opacity duration-700 group-hover:opacity-100 transform-gpu will-change-transform" />
                  <Lock className="mb-4 size-6 text-app-text-secondary" />
                  <h3 className="mb-2 text-lg font-medium tracking-tight text-app-text-secondary">Perfect Isolation</h3>
                  <p className="text-sm leading-relaxed text-app-text-muted">
                    Secure, multi-tenant architecture. Your data is perfectly isolated.
                  </p>
                </motion.div>

                {/* Feature 3 - Small Bottom Right */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="group relative flex min-h-[240px] flex-col justify-end overflow-hidden rounded-3xl border border-app-border-subtle bg-app-surface-glass-faint p-8 transition-all duration-500 hover:border-app-border-default hover:bg-app-surface-glass-soft"
                >
                  <div className="absolute top-0 left-0 h-[200px] w-[200px] -translate-x-1/4 -translate-y-1/4 rounded-full bg-app-surface-glass blur-[50px] opacity-0 transition-opacity duration-700 group-hover:opacity-100 transform-gpu will-change-transform" />
                  <Brain className="mb-4 size-6 text-app-text-secondary" />
                  <h3 className="mb-2 text-lg font-medium tracking-tight text-app-text-secondary">Persistent Memory</h3>
                  <p className="text-sm leading-relaxed text-app-text-muted">
                    Jarvis remembers your facts and context across sessions.
                  </p>
                </motion.div>

                {/* Feature 4 - Bottom Full */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="group relative overflow-hidden rounded-3xl border border-app-border-subtle bg-app-surface-glass-faint p-8 transition-all duration-500 hover:border-app-border-default hover:bg-app-surface-glass-soft md:col-span-3 md:p-12"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-app-surface-glass-soft to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                  <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12 relative z-10">
                    <div className="flex-1">
                      <Calendar className="mb-6 size-8 text-app-text-secondary" />
                      <h3 className="mb-3 text-2xl font-medium tracking-tight text-app-text-secondary">Task Automation</h3>
                      <p className="max-w-xl text-sm leading-relaxed text-app-text-muted md:text-base">
                        Set up one-time or recurring cron-jobs. Let the AI autonomously check the weather, fetch reports, or send you daily briefings directly to your dashboard without you lifting a finger.
                      </p>
                    </div>
                  </div>
                </motion.div>

              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="border-b border-app-border-default">
          <div className="w-full max-w-300 mx-auto py-16 border-l border-r border-app-border-default px-4 md:px-8 text-center">
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-app-border-default bg-app-canvas">
        <div className="w-full max-w-300 mx-auto py-8 border-l border-r border-app-border-default px-4 md:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between text-xs text-app-text-muted md:flex-row">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Bot className="size-4" />
              <span className="font-medium">Jarvis AI</span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="transition-colors hover:text-app-text-secondary">Privacy Policy</a>
              <a href="#" className="transition-colors hover:text-app-text-secondary">Terms of Service</a>
              <span>© {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
