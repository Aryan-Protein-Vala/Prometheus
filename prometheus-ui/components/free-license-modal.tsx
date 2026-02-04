"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, Loader2, Copy, Check } from "lucide-react"

interface FreeLicenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FreeLicenseModal({ open, onOpenChange }: FreeLicenseModalProps) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [licenseKey, setLicenseKey] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email")
      return
    }

    setStatus("loading")
    setError("")

    try {
      const response = await fetch("/api/free-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok && data.licenseKey) {
        setLicenseKey(data.licenseKey)
        setStatus("success")
      } else {
        setError(data.error || "Something went wrong")
        setStatus("error")
      }
    } catch {
      setError("Network error. Please try again.")
      setStatus("error")
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(licenseKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setEmail("")
    setStatus("idle")
    setLicenseKey("")
    setError("")
    setCopied(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium tracking-tight">
            {status === "success" ? "Your License Key" : "Get Prometheus Free"}
          </DialogTitle>
        </DialogHeader>

        {status === "success" ? (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-3 text-green-500">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">License generated successfully!</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Your License Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-3 bg-foreground/5 border border-border text-sm font-mono break-all">
                  {licenseKey}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="p-3 bg-foreground/5 border border-border hover:bg-foreground/10 transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">Next steps:</p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Copy the license key above</li>
                <li>Install Prometheus: <code className="text-xs bg-foreground/5 px-1">curl -sL https://prometheus-cleaner.vercel.app/install.sh | bash</code></li>
                <li>Run <code className="text-xs bg-foreground/5 px-1">prometheus</code> and enter your key</li>
              </ol>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <p className="text-sm text-muted-foreground">
              Get instant access to Prometheus. No payment required.
            </p>

            <div className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                disabled={status === "loading"}
              />
              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Get Free License"
              )}
            </button>

            <p className="text-xs text-muted-foreground text-center">
              We'll send product updates to your email. No spam, ever.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
