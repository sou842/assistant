"use client";

import { useEffect, useState, useRef } from "react";
import { portfolio } from "@/lib/portfolio";
import { ExternalLink, Code2, Smartphone, Globe } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const projectIcons: Record<string, React.ReactNode> = {
  "WEB APP": <Globe className="w-6 h-6" />,
  "MOBILE APP": <Smartphone className="w-6 h-6" />,
};

const projects = portfolio.projects;

export function IntegrationsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const isMobile = useIsMobile();
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

  return (
    <section id="integrations" ref={sectionRef} className="relative overflow-hidden">

      {/* Header — centré verticalement sur l'image */}
      <div className="relative z-10 pt-32 lg:pt-40 text-center">
        <span className={`inline-flex items-center gap-4 text-sm font-mono text-muted-foreground mb-8 transition-all duration-700 justify-center ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}>
          <span className="w-12 h-px bg-foreground/20" />
          Project Gallery
          <span className="w-12 h-px bg-foreground/20" />
        </span>

        <h2 className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          Featured
          <br />
          <span className="text-muted-foreground">Work.</span>
        </h2>

        <p className={`mt-8 text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto transition-all duration-1000 delay-100 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}>
          A collection of high-impact applications, ranging from AI automation tools to large-scale healthcare platforms.
        </p>
      </div>

      {/* Full-width image - keeping it for aesthetic, maybe it's a wireframe or code visualization */}
      <div className={`relative left-1/2 -translate-x-1/2 w-screen -mt-16 transition-all duration-1000 delay-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}>
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/connection-KeJwWPQvn6l0a7C48tCARYtNEdC92H.png"
          alt=""
          aria-hidden="true"
          className="w-full h-auto object-cover opacity-80 saturate-150 brightness-110"
        />
      </div>

      {/* Project grid */}
      <div className="relative z-10 mt-0 lg:-mt-24 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-24 lg:mb-32">
          {projects.map((project, index) => (
            <a
              key={project.name}
              href={project.liveDemo || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative overflow-hidden p-8 lg:p-10 border transition-all duration-500 bg-black/40 backdrop-blur-xl ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: `${index * 100 + 300}ms`,
              }}
              onMouseEnter={(e) => {
                if (isMobile) return;
                setHoveredIndex(index);
                const rect = e.currentTarget.getBoundingClientRect();
                setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              onMouseMove={(e) => {
                if (isMobile) return;
                const rect = e.currentTarget.getBoundingClientRect();
                setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              onMouseLeave={() => {
                setHoveredIndex(null);
                setMousePos(null);
              }}
            >
              {/* Cursor-following halo */}
              {hoveredIndex === index && mousePos && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0"
                  style={{
                    background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.05) 0%, transparent 70%)`,
                  }}
                />
              )}
              
              {/* Type tag */}
              <span className={`absolute top-4 right-4 text-[10px] font-mono px-3 py-1 transition-colors uppercase tracking-widest ${
                hoveredIndex === index
                  ? "bg-white text-black"
                  : "bg-white/5 text-white/40"
              }`}>
                {project.type}
              </span>

              {/* Icon */}
              <div className={`mb-10 transition-colors ${
                hoveredIndex === index ? "text-brand-primary" : "text-white/20"
              }`}>
                {projectIcons[project.type] || <Globe className="w-8 h-8" />}
              </div>

              <h3 className="text-3xl lg:text-4xl font-display mb-4 group-hover:translate-x-1 transition-transform duration-500">
                {project.name}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-sm">
                {project.description}
              </p>

              {/* Tech Stack */}
              <div className="flex flex-wrap gap-2 mb-10">
                {project.techStack.map(tech => (
                  <span key={tech} className="text-[10px] font-mono text-white/30 uppercase tracking-tighter border border-white/10 px-2 py-0.5">
                    {tech}
                  </span>
                ))}
              </div>

              {/* Link indicator */}
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">
                View Project <ExternalLink className="w-3 h-3" />
              </div>

              {/* Animated bottom line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
