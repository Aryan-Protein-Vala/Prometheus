"use client"

import { useEffect, useRef } from "react"

const engines = [
  {
    id: "NE-01",
    name: "Network Enforcer",
    codename: "PROTOCOL-NE",
    description: "Zero-latency background daemon running as root. Surgically manipulates OS hosts to block distracting domains offline.",
    status: "ACTIVE",
    statusColor: "bg-green-500",
  },
  {
    id: "DF-01",
    name: "Deep Flush",
    codename: "PROTOCOL-DF",
    description: "Identifies hidden cache rot, phantom duplicates, and ad-trackers across the entire fleet.",
    status: "ACTIVE",
    statusColor: "bg-green-500",
  },
  {
    id: "AD-04",
    name: "Admin Dashboard",
    codename: "PROTOCOL-AD",
    description: "Tamper-proof React UI embedded directly in the Rust binary. Manage global blocklists via localhost:4444.",
    status: "ACTIVE",
    statusColor: "bg-green-500",
  },
  {
    id: "SA-01",
    name: "Security Audit",
    codename: "PROTOCOL-SA",
    description: "Deep scans for exposed .env, .pem, and SSH keys. 100% offline detection for compliance.",
    status: "ACTIVE",
    statusColor: "bg-green-500",
  },
]

export function CoreEngines() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const cards = section.querySelectorAll(".engine-card")

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in-up")
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    )

    cards.forEach((card, index) => {
      ; (card as HTMLElement).style.animationDelay = `${index * 150}ms`
      observer.observe(card)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Core Systems
          </span>
          <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">The Engines</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {engines.map((engine) => (
            <div
              key={engine.id}
              className="engine-card group relative overflow-hidden border border-border bg-card p-6 opacity-0 transition-all duration-300 hover:border-muted-foreground/50"
            >
              {/* Classification header */}
              <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                <span className="font-mono text-xs text-muted-foreground">{engine.codename}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${engine.statusColor}`} />
                  {engine.status}
                </span>
              </div>

              {/* ID Badge */}
              <div className="mb-4 inline-block border border-border px-3 py-1">
                <span className="font-mono text-sm text-muted-foreground">{engine.id}</span>
              </div>

              {/* Name */}
              <h3 className="mb-3 text-xl font-medium text-foreground">{engine.name}</h3>

              {/* Description */}
              <p className="text-sm leading-relaxed text-muted-foreground">{engine.description}</p>

              {/* Corner decoration */}
              <div className="absolute bottom-0 right-0 h-8 w-8 border-l border-t border-border opacity-30" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
