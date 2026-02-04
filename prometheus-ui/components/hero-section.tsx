"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Terminal, X } from "lucide-react"

function FadeInText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timeout)
  }, [delay])

  return (
    <span
      className={`inline-block transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[-20px]"
        }`}
    >
      {text}
    </span>
  )
}

type Platform = "mac" | "windows" | "linux" | null

const platformData = {
  mac: {
    name: "macOS",
    label: "Mac",
    steps: [
      "Open Terminal (Cmd + Space, type 'Terminal')",
      "Run this command:",
    ],
    command: "curl -sL https://prometheus-cleaner.vercel.app/install.sh | bash",
    notes: [
      "Works on Intel & Apple Silicon",
      "Requires macOS 11.0 or later",
      "Installs to /usr/local/bin/prometheus",
    ],
  },
  windows: {
    name: "Windows",
    label: "Windows",
    steps: [
      "Open PowerShell as Administrator",
      "Run this command:",
    ],
    command: "irm https://prometheus-cleaner.vercel.app/install.ps1 | iex",
    notes: [
      "Requires Windows 10/11",
      "May need to allow script execution",
      "Installs to C:\\Users\\YourName\\.prometheus\\",
    ],
  },
  linux: {
    name: "Linux",
    label: "Linux",
    steps: [
      "Open your terminal",
      "Run this command:",
    ],
    command: "curl -sL https://prometheus-cleaner.vercel.app/install.sh | bash",
    notes: [
      "Works on Ubuntu, Debian, Fedora, Arch",
      "Requires sudo for /usr/local/bin install",
      "Or install locally to ~/.local/bin",
    ],
  },
}

export function HeroSection() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(null)
  const [copied, setCopied] = useState(false)

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const closeModal = () => {
    setSelectedPlatform(null)
    setCopied(false)
  }

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
      {/* Logo */}
      <div className="mb-12">
        <h2 className="text-xl font-light tracking-[0.4em] text-muted-foreground uppercase">
          <FadeInText text="PROMETHEUS" delay={100} />
        </h2>
      </div>

      {/* Headline */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-medium tracking-tight text-foreground md:text-7xl lg:text-8xl">
          <FadeInText text="Your OS." delay={200} />
        </h1>
        <div className="relative mt-4 inline-block">
          <h1 className="relative z-10 text-5xl font-medium tracking-tight md:text-7xl lg:text-8xl text-foreground">
            <FadeInText text="Surgically Clean." delay={400} />
          </h1>
          {/* Animated underline accent */}
          <div className="absolute -bottom-2 left-0 h-px w-full overflow-hidden md:-bottom-3">
            <div
              className="h-full w-full bg-gradient-to-r from-transparent via-foreground/60 to-transparent animate-shimmer"
              style={{
                backgroundSize: "200% 100%",
                animation: "shimmer 3s ease-in-out infinite",
              }}
            />
          </div>
          {/* Subtle glow behind text */}
          <div className="absolute inset-0 -z-10 blur-3xl opacity-20">
            <div className="h-full w-full bg-gradient-to-r from-muted-foreground/50 via-foreground/30 to-muted-foreground/50" />
          </div>
        </div>
      </div>

      {/* Subhead */}
      <p className="mb-12 max-w-2xl text-center text-lg text-muted-foreground md:text-xl">
        <FadeInText text="The 100% offline terminal cleaner. Zero data leaves your device." delay={600} />
      </p>

      {/* Platform Selection */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700">
        <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground/60">
          Download
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* macOS */}
          <button
            onClick={() => setSelectedPlatform("mac")}
            className="cursor-pointer px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium tracking-wide text-muted-foreground border border-border/50 bg-transparent transition-all duration-300 hover:border-foreground/30 hover:text-foreground hover:bg-foreground/5 hover:scale-[1.02] active:scale-[0.98]"
          >
            Mac
          </button>

          <span className="text-muted-foreground/30 mx-1 select-none hidden sm:inline">/</span>

          {/* Windows */}
          <button
            onClick={() => setSelectedPlatform("windows")}
            className="cursor-pointer px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium tracking-wide text-muted-foreground border border-border/50 bg-transparent transition-all duration-300 hover:border-foreground/30 hover:text-foreground hover:bg-foreground/5 hover:scale-[1.02] active:scale-[0.98]"
          >
            Windows
          </button>

          <span className="text-muted-foreground/30 mx-1 select-none hidden sm:inline">/</span>

          {/* Linux */}
          <button
            onClick={() => setSelectedPlatform("linux")}
            className="cursor-pointer px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium tracking-wide text-muted-foreground border border-border/50 bg-transparent transition-all duration-300 hover:border-foreground/30 hover:text-foreground hover:bg-foreground/5 hover:scale-[1.02] active:scale-[0.98]"
          >
            Linux
          </button>
        </div>

        {/* Secondary Links */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <a
            href="#pricing"
            className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border hover:decoration-foreground"
          >
            Buy Licence Key
          </a>
          <span className="text-muted-foreground/30 hidden sm:inline">•</span>
          <a
            href="https://github.com/Aryan-Protein-Vala/Prometheus"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border hover:decoration-foreground"
          >
            Open Source on GitHub
          </a>
        </div>
      </div>

      {/* Scroll indicator - hidden on mobile */}
      <div className="absolute bottom-8 md:bottom-12 hidden md:flex flex-col items-center gap-2">
        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Scroll</span>
        <div className="h-12 w-px bg-gradient-to-b from-muted-foreground/50 to-transparent" />
      </div>

      {/* Installation Modal */}
      {selectedPlatform && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-lg border border-border bg-background p-8 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="mb-8">
              <h3 className="text-lg font-medium tracking-tight text-foreground">
                {platformData[selectedPlatform].name}
              </h3>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/60">Installation</p>
            </div>

            {/* Steps */}
            <div className="mb-6 space-y-4">
              {platformData[selectedPlatform].steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="flex h-5 w-5 items-center justify-center text-xs font-mono text-muted-foreground">
                    {i + 1}.
                  </span>
                  <span className="text-sm text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>

            {/* Command */}
            <div
              onClick={() => copyCommand(platformData[selectedPlatform].command)}
              className="group mb-8 cursor-pointer border border-border bg-black/40 p-4 transition-all hover:border-foreground/30"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 font-mono text-sm overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  <Terminal className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <code className="text-foreground whitespace-nowrap">{platformData[selectedPlatform].command}</code>
                </div>
                <div className="flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3 border-t border-border pt-6">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">Notes</span>
              <ul className="space-y-2">
                {platformData[selectedPlatform].notes.map((note, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px w-2 bg-muted-foreground/30" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
