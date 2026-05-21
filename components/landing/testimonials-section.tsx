"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { portfolio } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

const testimonials = portfolio.recommendations.map(t => ({
    quote: t.text,
    author: t.name,
    role: t.title,
    company: t.relation,
    metric: { value: "Endorsed", label: "Professional Feedback" }
}));

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const goTo = (index: number) => {
    setActiveIndex(index);
  };

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const activeTestimonial = testimonials[activeIndex];

  return (
<section 
  ref={sectionRef} 
  className="relative py-32 lg:py-44 bg-background overflow-hidden"
  id="testimonials"
>
  {/* Subtle Gradient Background */}
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.08),transparent_40%)]" />

  <div className="relative z-10 max-w-6xl mx-auto px-6">
    
    {/* Header */}
    <div className="flex items-center justify-between mb-20">
      <h2 className="text-4xl md:text-6xl font-display tracking-tight">
        Kind <span className="text-brand-primary italic">Words</span>
      </h2>

      <div className="flex gap-3">
        <button
          onClick={goPrev}
          className="p-3 rounded-full border border-white/10 hover:border-brand-primary transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={goNext}
          className="p-3 rounded-full border border-white/10 hover:border-brand-primary transition"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Main Layout */}
    <div className="flex flex-col md:flex-row items-center justify-between">
      
      {/* LEFT → Quote */}
      <div key={activeIndex} className="transition-all duration-700">
        <Quote className="w-10 h-10 text-brand-primary/40 mb-6" />

        <blockquote className="text-2xl md:text-3xl leading-snug font-normal text-white/90">
          “{activeTestimonial.quote}”
        </blockquote>

        <div className="mt-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-semibold">
            {activeTestimonial.author.charAt(0)}
          </div>

          <div>
            <p className="font-medium">{activeTestimonial.author}</p>
            <p className="text-sm text-white/50">
              {activeTestimonial.role} • {activeTestimonial.company}
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT → Card */}
      
    </div>

    {/* Bottom Selectors */}
    <div className="mt-16 flex flex-wrap gap-3">
      {testimonials.map((t, idx) => (
        <button
          key={t.author}
          onClick={() => goTo(idx)}
          className={cn(
            "px-4 py-2 text-xs rounded-full border transition",
            idx === activeIndex
              ? "border-brand-primary text-brand-primary bg-brand-primary/10"
              : "border-white/10 text-white/40 hover:text-white"
          )}
        >
          {t.company.split(",")[0]}
        </button>
      ))}
    </div>

  </div>
</section>
  );
}
