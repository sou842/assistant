"use client";

import { useEffect, useState, useRef } from "react";
import { portfolio } from "@/lib/portfolio";
import { Code2, Server, Database, Layout, Smartphone, Map as MapIcon } from "lucide-react";

const iconMap: { [key: string]: any } = {
  frontend: Code2,
  backend: Server,
  data: Database,
  platform: Layout,
  mobile: Smartphone,
  map: MapIcon,
};

export function SecuritySection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

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

  const skills = portfolio.skills as any[];

  return (
    <section id="expertise" ref={sectionRef} className="relative py-32 lg:py-40 overflow-hidden bg-foreground/[0.02]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20">
          <span className={`inline-flex items-center gap-4 text-sm font-mono text-muted-foreground mb-8 transition-all duration-700 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}>
            <span className="w-12 h-px bg-foreground/20" />
            Expertise
          </span>
          
          <h2 className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.9] mb-12 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}>
            Deeply Skilled,
            <br />
            <span className="text-muted-foreground">Broadly Capable.</span>
          </h2>
          
          <div className={`transition-all duration-1000 delay-100 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
              A comprehensive breakdown of my technical arsenal, categorized by domain and proficiency level.
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-12 gap-8 relative z-20">
          {/* Category Tabs */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {skills.map((cat, index) => {
              const Icon = iconMap[cat.id] || Code2;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(index)}
                  className={`p-6 border text-left transition-all duration-300 group backdrop-blur-md ${
                    activeCategory === index 
                      ? "border-foreground/30 bg-background/60 shadow-lg shadow-black/20" 
                      : "border-foreground/10 bg-background/20 hover:border-foreground/20 hover:bg-background/40"
                  } ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 flex items-center justify-center border transition-colors ${
                      activeCategory === index ? "border-foreground bg-foreground text-background" : "border-foreground/20"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg uppercase tracking-tight">{cat.label}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{cat.items.length} Technologies</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detailed Skill Grid */}
          <div className={`lg:col-span-8 p-8 lg:p-12 border border-foreground/10 bg-background/60 backdrop-blur-xl min-h-[500px] transition-all duration-700 shadow-2xl shadow-black/20 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {skills[activeCategory].items.map((skill: any, idx: number) => (
                <div 
                  key={skill.name} 
                  className="flex flex-col gap-2 transition-all duration-500"
                  style={{ transitionDelay: `${idx * 30}ms`, opacity: isVisible ? 1 : 0 }}
                >
                  <div className="flex justify-between items-end">
                    <span className="text-xl font-medium tracking-tight">{skill.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{skill.level}</span>
                  </div>
                  <div className="h-px w-full bg-foreground/10 relative overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-[#eca8d6]/40 transition-transform duration-1000 ease-out"
                      style={{ 
                        transform: `translateX(${skill.level === 'Advanced' ? '0' : '-30%'})`,
                        transitionDelay: `${idx * 50 + 400}ms`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Melded Analytics Graph */}
        <div className={`absolute bottom-0 left-0 right-0 h-full pointer-events-none transition-all duration-1000 delay-700 z-10 ${
          isVisible ? "opacity-60" : "opacity-0"
        }`}>
          <div 
            className="absolute inset-0 bg-bottom bg-no-repeat bg-cover"
            style={{
              backgroundImage: `url("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/real-time-graph-INFmn3u0MlUwvNPynoIhwxtPaPjxM5.png")`,
              maskImage: 'linear-gradient(to top, transparent, black 5%, black 20%, transparent 60%)',
              WebkitMaskImage: 'linear-gradient(to top, transparent, black 5%, black 20%, transparent 60%)',
            }}
          />
          {/* Subtle glow overlay to match the brand color */}
          {/* <div className="absolute inset-0 bg-[#eca8d6]/5 mix-blend-overlay" /> */}
        </div>
      </div>
    </section>
  );
}
