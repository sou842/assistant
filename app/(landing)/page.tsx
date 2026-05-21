import dynamic from 'next/dynamic';
import { Navigation } from "@/components/landing/navigation";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";

const IntegrationsSection = dynamic(() => import("@/components/landing/integrations-section").then(mod => mod.IntegrationsSection));
const SecuritySection = dynamic(() => import("@/components/landing/security-section").then(mod => mod.SecuritySection));
const TestimonialsSection = dynamic(() => import("@/components/landing/testimonials-section").then(mod => mod.TestimonialsSection));
const CtaSection = dynamic(() => import("@/components/landing/cta-section").then(mod => mod.CtaSection));
const FooterSection = dynamic(() => import("@/components/landing/footer-section").then(mod => mod.FooterSection));

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      {/* <InfrastructureSection /> */}
      {/* <MetricsSection /> */}
      <IntegrationsSection />
      <SecuritySection />
      {/* <DevelopersSection /> */}
      <TestimonialsSection />
      <CtaSection />
      <FooterSection />
    </main>
  );
}
