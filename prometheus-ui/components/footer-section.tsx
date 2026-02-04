import { Instagram, Github } from "lucide-react"
import Link from "next/link"

export function FooterSection() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          {/* Left */}
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground">Prometheus Systems © 2025. Built for the paranoid.</p>
          </div>

          {/* Center - Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link href="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/refund" className="text-muted-foreground transition-colors hover:text-foreground">
              Refunds
            </Link>
            <Link href="/contact" className="text-muted-foreground transition-colors hover:text-foreground">
              Contact
            </Link>
          </div>

          {/* Right - Social */}
          <div className="flex items-center gap-6">
            <a
              href="https://www.instagram.com/aryantilldusk/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/Aryan-Protein-Vala/Prometheus"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

