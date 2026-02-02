import { HeroSection } from "@/components/hero-section"
import { ProblemStrip } from "@/components/problem-strip"
import { CoreEngines } from "@/components/core-engines"
import { InteractiveDemo } from "@/components/interactive-demo"
import { PricingSection } from "@/components/pricing-section"
import { FooterSection } from "@/components/footer-section"

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background">
      <div className="grain-overlay" />
      <HeroSection />
      <ProblemStrip />
      <CoreEngines />
      <InteractiveDemo />
      <PricingSection />
      <FooterSection />
    </main>
  )
}
