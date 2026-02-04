"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { FreeLicenseModal } from "@/components/free-license-modal"

const features = [
  "Deep System Cleaning",
  "Windows & Mac Binary",
  "AI Inspector (Coming Soon)",
  "100% Privacy Guarantee",
  "Free Updates for V1"
]

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [licenseModalOpen, setLicenseModalOpen] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            section.classList.add("fade-in-up")
          }
        })
      },
      { threshold: 0.2 },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <section id="pricing" ref={sectionRef} className="px-6 py-24 md:py-32 opacity-0">
        <div className="mx-auto max-w-lg">
          <div className="mb-12 text-center">
            <span className="mb-4 inline-block text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Open Access
            </span>
            <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">Founder Edition</h2>
          </div>

          {/* Pricing Card */}
          <div className="border border-border bg-card p-8 md:p-12">
            <div className="mb-8 text-center">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Founder Edition V1</span>
            </div>

            {/* Price - Now FREE */}
            <div className="mb-8 text-center">
              <span className="text-5xl font-medium text-foreground">$0</span>
              <span className="ml-2 text-muted-foreground">/ Free Forever</span>
            </div>

            {/* Features */}
            <ul className="mb-10 space-y-4">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-muted-foreground">
                  <Check className="h-4 w-4 text-foreground" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA - Opens free license modal */}
            <Button
              onClick={() => setLicenseModalOpen(true)}
              className="breathing-glow w-full bg-foreground text-background hover:bg-foreground/90 py-6 text-base font-medium"
            >
              Get Licence Key
            </Button>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              No payment required. No data harvesting. Just enter your email.
            </p>
          </div>
        </div>
      </section>

      {/* Free License Modal */}
      <FreeLicenseModal open={licenseModalOpen} onOpenChange={setLicenseModalOpen} />
    </>
  )
}
