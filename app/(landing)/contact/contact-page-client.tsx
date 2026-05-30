"use client";

import Navbar from '@/components/Navbar';
import ClickSpark from '@/components/ClickSpark';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import Footer from '@/components/Footer';
import BackgroundGrid from '@/components/BackgroundGrid';

export default function ContactPageClient() {
  return (
    <main className="app-page-shell app-selection">
      <ClickSpark sparkColor="#ffffff" sparkSize={10} sparkRadius={20} sparkCount={10} duration={500} bindToWindow={true} />
      <BackgroundGrid />

      <Navbar />

      <div className="relative z-10 pt-24 md:pt-32 min-h-screen flex flex-col justify-between">
        <div className="w-full max-w-6xl mx-auto px-4 md:px-8 flex-1 flex flex-col justify-center items-center">
          <div className="text-center mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-6xl font-medium tracking-tight text-app-text-primary mb-6"
            >
              Get in Touch
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-app-text-secondary max-w-2xl mx-auto mb-10"
            >
              Our contact features are currently under development. In the meantime, feel free to reach out to us directly via email.
            </motion.p>

            <motion.a
              href="mailto:hello@jarvis.ai"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-3 rounded-full bg-app-surface-elevated px-8 py-4 font-medium text-app-text-primary transition-all hover:bg-app-surface-hover border border-app-border-subtle hover:border-app-border-default hover:-translate-y-0.5"
            >
              <Mail className="size-5" />
              hello@jarvis.ai
            </motion.a>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
