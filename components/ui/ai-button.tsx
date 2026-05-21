"use client";

import React from "react";
import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AIButton() {
  return (
    <Link
      href="/ai"
      className={cn(
        "fixed bottom-8 right-8 z-[100]",
        "group flex items-center justify-center",
        "w-14 h-14 rounded-full",
        "bg-black/50 backdrop-blur-md border border-white/10",
        "shadow-[0_0_20px_rgba(132,0,255,0.3)]",
        "hover:shadow-[0_0_30px_rgba(132,0,255,0.5)]",
        "hover:border-white/20 transition-all duration-300",
        "overflow-hidden"
      )}
      aria-label="AI Section"
    >
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Glowing Ring */}
      <div className="absolute -inset-1 bg-gradient-to-r from-white/60 to-white/60 rounded-full blur opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
      
      {/* Icon */}
      <Bot className="w-6 h-6 text-white relative z-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
      
      {/* Subtle Shine Effect */}
      <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] group-hover:animate-[shine_1.5s_infinite]" />
      
      <style jsx global>{`
        @keyframes shine {
          100% {
            left: 200%;
          }
        }
      `}</style>
    </Link>
  );
}
