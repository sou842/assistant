"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Bot,
  Brain,
  Database,
  Github,
  Lock,
  MessageSquare,
  Calendar,
  Globe,
  ArrowRight
} from 'lucide-react';

export default function Home() {
  return (
    <main className="relative min-h-screen bg-black text-white selection:bg-white/30 font-sans overflow-hidden">
      {/* Background Gradients & Grid */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-200 h-125 bg-white/2 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="w-full max-w-300 mx-auto border-l border-r border-white/10 px-4 md:px-8">
          <div className="mx-auto max-w-6xl h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-white" />
              <span className="text-base font-medium tracking-tight text-white">Jarvis</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-white text-black px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        {/* Hero Section */}
        <div className='border-b border-white/10'>
          <div className="w-full max-w-300 min-h-[calc(100vh-4rem)] mx-auto text-center flex flex-col items-center justify-center relative border-l border-r border-white/10">
            <div className="w-full max-w-200 pt-16 pb-20 md:pt-20 md:pb-28 px-4 relative z-20">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl md:text-6xl font-medium tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-6"
              >
                The Intelligent OS for Your Digital Life
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="max-w-2xl mx-auto text-lg text-gray-400 mb-10 leading-relaxed"
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
                  className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full font-medium hover:bg-gray-200 transition-all duration-200 group w-full sm:w-auto justify-center"
                >
                  Start Chatting
                  <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="#features"
                  className="flex items-center gap-2 bg-transparent border border-white/10 text-white px-6 py-2.5 rounded-full font-medium hover:bg-white/5 transition-all duration-200 w-full sm:w-auto justify-center"
                >
                  View Features
                </a>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Hero Section Divider */}
        <div className="border-b border-white/10">
          <div className="w-full max-w-300 mx-auto py-16 border-l border-r border-white/10 px-4 md:px-8 text-center">
          </div>
        </div>

        {/* Feature Grid (Bento Box) */}
        <div id="features" className="border-b border-white/10 bg-black/20">
          <div className="w-full max-w-300 mx-auto py-20 md:py-32 border-l border-r border-white/10 px-4 md:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

                {/* Feature 1 - Large Top */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5 }}
                  className="md:col-span-2 row-span-2 rounded-3xl border border-white/5 bg-white/[0.01] p-8 md:p-12 relative overflow-hidden group hover:border-white/10 hover:bg-white/[0.02] transition-all duration-500"
                >
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <Database className="size-8 text-white/80 mb-6" />
                  <h3 className="text-2xl font-medium mb-3 tracking-tight text-white/90">The Vault</h3>
                  <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-md">
                    Natively store markdown notes, interactive spreadsheets, and media galleries. Your personal data is automatically organized and instantly retrievable by the AI whenever you need it.
                  </p>
                </motion.div>

                {/* Feature 2 - Small Top Right */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="rounded-3xl border border-white/5 bg-white/[0.01] p-8 relative overflow-hidden group hover:border-white/10 hover:bg-white/[0.02] transition-all duration-500 flex flex-col justify-end min-h-[240px]"
                >
                  <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-white/5 blur-[50px] rounded-full translate-x-1/4 translate-y-1/4 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <Lock className="size-6 text-white/80 mb-4" />
                  <h3 className="text-lg font-medium mb-2 tracking-tight text-white/90">Perfect Isolation</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Secure, multi-tenant architecture. Your data is perfectly isolated.
                  </p>
                </motion.div>

                {/* Feature 3 - Small Bottom Right */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="rounded-3xl border border-white/5 bg-white/[0.01] p-8 relative overflow-hidden group hover:border-white/10 hover:bg-white/[0.02] transition-all duration-500 flex flex-col justify-end min-h-[240px]"
                >
                  <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-white/5 blur-[50px] rounded-full -translate-x-1/4 -translate-y-1/4 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <Brain className="size-6 text-white/80 mb-4" />
                  <h3 className="text-lg font-medium mb-2 tracking-tight text-white/90">Persistent Memory</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Jarvis remembers your facts and context across sessions.
                  </p>
                </motion.div>

                {/* Feature 4 - Bottom Full */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="md:col-span-3 rounded-3xl border border-white/5 bg-white/[0.01] p-8 md:p-12 relative overflow-hidden group hover:border-white/10 hover:bg-white/[0.02] transition-all duration-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12 relative z-10">
                    <div className="flex-1">
                      <Calendar className="size-8 text-white/80 mb-6" />
                      <h3 className="text-2xl font-medium mb-3 tracking-tight text-white/90">Task Automation</h3>
                      <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-xl">
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
        <div className="border-b border-white/10">
          <div className="w-full max-w-300 mx-auto py-16 border-l border-r border-white/10 px-4 md:px-8 text-center">
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black">
        <div className="w-full max-w-300 mx-auto py-8 border-l border-r border-white/10 px-4 md:px-8">
          <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between text-gray-500 text-xs">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Bot className="size-4" />
              <span className="font-medium">Jarvis AI</span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
              <span>© {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}