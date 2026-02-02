import { Twitter, Github } from "lucide-react"

export function FooterSection() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <p className="text-sm text-muted-foreground">Prometheus Systems © 2025. Built for the paranoid.</p>

          <div className="flex items-center gap-6">
            <a href="#" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Twitter">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="GitHub">
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
