"use client"

import { useEffect, useRef } from "react"

const problems = [
  "CLOUD CLEANERS SPY ON YOU",
  "BLOATWARE SLOWS YOU DOWN",
  "RECLAIM YOUR RAM",
  "OFFLINE INTELLIGENCE",
  "ZERO TELEMETRY",
  "AIR-GAPPED SECURITY",
]

export function ProblemStrip() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            container.classList.add("fade-in-up")
          }
        })
      },
      { threshold: 0.1 },
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden border-y border-border bg-secondary/30 py-6 opacity-0"
    >
      <div className="animate-marquee flex whitespace-nowrap">
        {[...problems, ...problems, ...problems, ...problems].map((problem, index) => (
          <span key={index} className="mx-8 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {problem}
            <span className="ml-8 text-muted-foreground/40">•</span>
          </span>
        ))}
      </div>
    </section>
  )
}
