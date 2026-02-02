"use client"

import { useEffect, useRef, useState } from "react"

export function InteractiveDemo() {
  const sectionRef = useRef<HTMLElement>(null)
  const [showResponse, setShowResponse] = useState(false)
  const [typedQuery, setTypedQuery] = useState("")
  const query = "Find all PDF invoices from last October."

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            section.classList.add("fade-in-up")
            // Start typing animation
            let i = 0
            const typeInterval = setInterval(() => {
              if (i < query.length) {
                setTypedQuery(query.slice(0, i + 1))
                i++
              } else {
                clearInterval(typeInterval)
                setTimeout(() => setShowResponse(true), 500)
              }
            }, 50)
          }
        })
      },
      { threshold: 0.3 },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="px-6 py-24 md:py-32 opacity-0">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <span className="mb-4 inline-flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            AI Preview
            <span className="text-[10px] tracking-widest text-muted-foreground/60 border border-border/50 px-2 py-0.5">Coming Soon</span>
          </span>
          <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">Intelligent Dialogue</h2>
        </div>

        {/* Terminal Window */}
        <div className="overflow-hidden border border-border bg-card">
          {/* Window Header */}
          <div className="flex items-center gap-2 border-b border-border bg-secondary/50 px-4 py-3">
            <div className="flex gap-2">
              <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
              <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
              <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
            </div>
            <span className="ml-4 font-mono text-xs text-muted-foreground">prometheus_v1.0.0</span>
          </div>

          {/* Terminal Content */}
          <div className="p-6 font-mono text-sm">
            {/* User Input */}
            <div className="mb-4 flex items-start gap-3">
              <span className="text-muted-foreground">{">"}</span>
              <span className="text-foreground">
                {typedQuery}
                <span className="animate-pulse">|</span>
              </span>
            </div>

            {/* Response */}
            {showResponse && (
              <div className="flex items-start gap-3 border-l-2 border-muted pl-4 text-muted-foreground">
                <div>
                  <p className="mb-2 text-foreground">Found 14 files. Total 12MB.</p>
                  <p className="text-muted-foreground">
                    Archive them to <span className="text-foreground">/Finance</span>?{" "}
                    <span className="inline-flex gap-2 ml-2">
                      <span className="border border-border px-2 py-0.5 text-xs hover:bg-secondary cursor-pointer transition-colors">
                        Y
                      </span>
                      <span className="border border-border px-2 py-0.5 text-xs hover:bg-secondary cursor-pointer transition-colors">
                        N
                      </span>
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
