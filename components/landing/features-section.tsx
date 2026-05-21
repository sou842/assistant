"use client";

import { useRef, useState, useEffect } from "react";
import { portfolio } from "@/lib/portfolio";
import { MagicBento } from "@/components/ui/magic-bento";

const features = [
  {
    label: "01",
    title: "AI Browser Automation",
    description: "Developed chrome-based AI tools for scraping and workflow execution at 100x Bot.",
    stats: { value: "100x", label: "efficiency boost" },
    colSpan: "lg:col-span-8 md:col-span-12",
  },
  {
    label: "02",
    title: "Healthcare Scalability",
    description: "Built large-scale healthcare platforms with React and TypeScript at InspironLabs.",
    stats: { value: "10k+", label: "data points managed" },
    colSpan: "lg:col-span-4 md:col-span-12",
  },
  {
    label: "03",
    title: "Real-time Architecture",
    description: "Implementing seamless communication with Socket.IO and advanced backend integration.",
    stats: { value: "<50ms", label: "latency achieved" },
    colSpan: "lg:col-span-4 md:col-span-12",
  },
  {
    label: "04",
    title: "Global Localization",
    description: "Architecting multi-language systems for diverse user bases across the globe.",
    stats: { value: "15+", label: "languages supported" },
    colSpan: "lg:col-span-8 md:col-span-12",
  },
];

export function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header - Full width with diagonal layout */}
        <div className="relative mb-24 lg:mb-32">
          <div className="grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
                <span className="w-12 h-px bg-foreground/30" />
                About Me
              </span>
              <h2
                className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                The Vision
                <br />
                <span className="text-muted-foreground">Behind the Work.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className={`text-xl text-muted-foreground leading-relaxed transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}>
                {portfolio.about.bio}
              </p>
            </div>
          </div>
        </div>

        {/* Magic Bento Grid */}
        <div className={`transition-all duration-1000 delay-400 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        }`}>
          <MagicBento 
            items={features}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt={true}
            glowColor="132, 0, 255"
          />
        </div>
      </div>
    </section>
  );
}
