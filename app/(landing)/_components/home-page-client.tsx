"use client";

import Link from 'next/link';
import ClickSpark from '@/components/ClickSpark';
import { motion } from 'framer-motion';
import { ArrowUpRight, MessageCircleDashed } from 'lucide-react';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import FaqAccordion, { type FaqItem } from '@/components/FaqAccordion';
import { homeFaqItems, homeFeatures } from '../home-data';

const features = homeFeatures;

export default function HomePageClient() {
  return (
    <main className="app-page-shell app-selection">
      <ClickSpark sparkColor="#ffffff" sparkSize={10} sparkRadius={20} sparkCount={10} duration={500} bindToWindow={true} />

      <Navbar />

      <div className="relative z-10">
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
                Jarvis provides AI scheduling, task automation, integrations, and persistent memory to help you build a faster, more personalized workflow.
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
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-black/20 px-6 py-2.5 font-medium text-app-text-primary transition-all duration-200 hover:bg-app-surface-glass sm:w-auto"
                >
                  View Features
                </a>
              </motion.div>
            </div>
          </div>
        </div>

        <Divider />

        <div
          id="features"
          className="border-b border-app-border-default bg-app-canvas/20 overflow-hidden"
        >
          <div className="w-full max-w-300 mx-auto border-l border-r border-app-border-default px-4 py-20 md:px-8 md:py-32">
            <div className="mx-auto max-w-6xl flex flex-col gap-24 md:gap-32">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5 }}
                  className={`flex flex-col items-center gap-12 md:gap-20 ${
                    feature.reverse ? 'md:flex-row-reverse' : 'md:flex-row'
                  }`}
                >
                  <div className="w-full md:w-1/2 rounded-3xl overflow-hidden border border-app-border-subtle bg-blue-500/5 p-2 md:p-6 shadow-2xl relative">
                    <div className="absolute inset-0 bg-blue-500/10 blur-3xl -z-10" />

                    <img
                      src={feature.image}
                      className="w-full h-auto rounded-xl md:rounded-2xl border border-app-border-subtle/50 shadow-xl"
                      alt={feature.alt}
                      loading="lazy"
                    />
                  </div>

                  <div className="w-full md:w-1/2 flex flex-col items-start text-left">
                    <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-app-text-primary mb-4">
                      {feature.title}
                    </h2>

                    <p className="text-base text-app-text-muted mb-8 leading-relaxed">
                      {feature.description}
                    </p>

                    <ul className="space-y-4 mb-8">
                      {feature.points.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-3 text-app-text-secondary"
                        >
                          <div className="flex items-center justify-center">
                            <MessageCircleDashed className="size-5 text-app-text-muted" />
                          </div>

                          {item}
                        </li>
                      ))}
                    </ul>

                    <Link href="/ai" className="flex items-center gap-2 rounded-full bg-app-text-primary px-6 py-3 font-medium text-app-canvas transition-all hover:opacity-90 hover:-translate-y-0.5">
                      {feature.buttonText}
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-b border-app-border-default bg-app-canvas/20">
          <div className="w-full max-w-300 mx-auto py-20 md:py-32 border-l border-r border-app-border-default px-4 md:px-8">
            <div className="mx-auto max-w-3xl text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-app-text-primary mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-app-text-secondary">
                Everything you need to know about Jarvis AI.
              </p>
            </div>
            <div className="mx-auto max-w-3xl text-left">
              <FaqAccordion items={homeFaqItems as FaqItem[]} />
            </div>
          </div>
        </div>

        <Divider />

        <Footer showCTA={true} />
      </div>
    </main>
  );
}

function Divider() {
  return (
    <div className="border-b border-app-border-default">
      <div className="w-full max-w-300 mx-auto py-16 border-l border-r border-app-border-default px-4 md:px-8 text-center" />
    </div>
  );
}
