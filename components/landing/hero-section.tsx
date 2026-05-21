"use client";

import { useEffect, useState, useRef } from "react";
import { portfolio } from "@/lib/portfolio";
import { SplineScene } from "../ui/spline-scene";
import { useIsMobile } from "@/hooks/use-mobile";

const words = ["Node.js", "React", "Scalable", "Fast"];

function BlurWord({ word, trigger }: { word: string; trigger: number }) {
  const letters = word.split("");
  const STAGGER = 45;
  const DURATION = 500;
  
  const [mounted, setMounted] = useState(false);
  const [showGradient, setShowGradient] = useState(true);

  useEffect(() => {
    setMounted(false);
    setShowGradient(true);
    
    const mountTimer = setTimeout(() => setMounted(true), 20);
    const gradientTimer = setTimeout(() => setShowGradient(false), STAGGER * letters.length + DURATION + 100);
    
    return () => {
      clearTimeout(mountTimer);
      clearTimeout(gradientTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, word]);

  const gradientColors = ["var(--brand-primary)", "#a78bfa", "#67e8f9", "#fbbf24", "var(--brand-primary)"];

  return (
    <>
      {letters.map((char, i) => {
        const colorIndex = (i / Math.max(letters.length - 1, 1)) * (gradientColors.length - 1);
        const lower = Math.floor(colorIndex);
        const upper = Math.min(lower + 1, gradientColors.length - 1);
        const t = colorIndex - lower;

        const hex2rgb = (hex: string) => {
          if (hex.startsWith('var')) return [236, 168, 214]; // Fallback for brand-primary
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return [r, g, b];
        };
        
        const [r1, g1, b1] = hex2rgb(gradientColors[lower]);
        const [r2, g2, b2] = hex2rgb(gradientColors[upper]);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return (
          <span
            key={`${trigger}-${i}`}
            className="inline-block"
            style={{
              opacity: mounted ? 1 : 0,
              filter: mounted ? "blur(0px)" : "blur(10px)",
              color: showGradient ? `rgb(${r},${g},${b})` : "white",
              transition: `opacity ${DURATION}ms ease, filter ${DURATION}ms ease, color 0.4s ease`,
              transitionDelay: mounted ? `${i * STAGGER}ms` : "0ms",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </>
  );
}

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const isMobile = useIsMobile();

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center items-start overflow-hidden bg-black">
      {/* Background 3D Scene - Hidden on mobile for performance */}
      {/* <div className="absolute inset-0 z-0">
        {!isMobile && (
          <div className="absolute inset-y-0 right-0 w-full lg:w-[60%] xl:w-[55%] h-full opacity-80">
            <SplineScene
              scene="https://prod.spline.design/UbM7F-HZcyTbZ4y3/scene.splinecode"
              className="w-full h-full"
            />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
      </div> */}

      {/* Subtle grid lines */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none opacity-20">
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-white/10"
            style={{
              top: `${12.5 * (i + 1)}%`,
              left: 0,
              right: 0,
            }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-white/10"
            style={{
              left: `${8.33 * (i + 1)}%`,
              top: 0,
              bottom: 0,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 py-32 lg:py-40">
        <div className="lg:max-w-[70%]">
        {/* Eyebrow */}
        <div 
          className={`mb-8 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="inline-flex items-center gap-3 md:text-sm text-xs font-mono text-white/60 uppercase">
            <span className="w-8 h-px bg-white/30" />
            {portfolio.personal.title} &bull; {portfolio.personal.location}
          </span>
        </div>
        
        {/* Main headline */}
        <div className="mb-12">
          <h1 
            className={`text-left text-[clamp(2.5rem,8vw,8rem)] font-display leading-[0.92] tracking-tight text-white transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="block whitespace-nowrap">{portfolio.personal.name.split(' ')[0]},</span>
            <span className="block whitespace-nowrap">
              building{" "}
              <span className="relative inline-block">
                <BlurWord word={words[wordIndex]} trigger={wordIndex} />
              </span>
            </span>
          </h1>
          <p className={`mt-8 text-xl lg:text-2xl text-white/60 max-w-xl leading-relaxed transition-all duration-1000 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}>
            {portfolio.personal.tagline}
          </p>
        </div>
        </div>
      </div>
      
      {/* Stats — 3 metrics static, no auto-scroll */}
      <div 
        className={`absolute bottom-12 left-0 right-0 px-6 lg:px-12 transition-all duration-700 delay-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="max-w-[1400px] mx-auto flex items-start gap-10 lg:gap-20 px-6 lg:px-12">
          {[
            { value: portfolio.personal.experience, label: "Professional experience" },
            { value: "10+", label: "Projects delivered" },
            { value: "<1s", label: "Average loading time" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-2">
              <span className="text-3xl lg:text-4xl font-display text-white">{stat.value}</span>
              <span className="text-xs text-white/50 leading-tight uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}

    </section>
  );
}
