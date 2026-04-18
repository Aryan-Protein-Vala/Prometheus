"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound, ShieldAlert, Loader2, Mail } from "lucide-react"

export default function AdminLogin() {
  const [licenseKey, setLicenseKey] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const normalizedKey = licenseKey.trim().toUpperCase()
      const response = await fetch("/api/verify-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: normalizedKey, email }),
      })

      const data = await response.json()

      if (data.valid) {
        // Store license info in session (for demo/simplicity, using localStorage)
        localStorage.setItem("prometheus_admin_key", licenseKey)
        localStorage.setItem("prometheus_admin_email", email)
        router.push("/admin/dashboard")
      } else {
        setError(data.message || "Unauthorized: Access Denied")
      }
    } catch (err) {
      setError("System unreachable. Check connection.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="grain-overlay" />
      
      <div className="z-10 w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 px-3 py-1 border border-white/10 rounded-full bg-white/5">
            <KeyRound className="h-3 w-3" />
            Security Sector
          </div>
          <h1 className="text-4xl font-light tracking-tighter text-white sm:text-5xl">
            Fleet ControlCenter
          </h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mt-4">
            Authorization Required for Organizational Management
          </p>
        </div>

        <div className="bg-card/30 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative overflow-hidden group">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-2 text-left">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Mail className="h-3 w-3" />
                Registry Email
              </Label>
              <Input
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/50 border-white/10 text-white h-12 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>

            <div className="space-y-2 text-left">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="h-3 w-3" />
                Enterprise License Key
              </Label>
              <Input
                type="text"
                placeholder="PROM-XXXX-XXXX"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                required
                className="bg-black/50 border-white/10 text-white font-mono h-12 focus:ring-1 focus:ring-white/20 transition-all uppercase"
              />
            </div>

            {error && (
              <div className="text-[10px] uppercase tracking-widest text-red-400 bg-red-400/10 border border-red-400/20 p-3 rounded font-bold">
                {error}
              </div>
            )}

            <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-white text-black hover:bg-neutral-200 h-14 rounded-xl text-xs font-bold uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(255,255,255,0.05)]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Authorize Connection"
              )}
            </Button>
          </form>
        </div>

        <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-loose">
          Authorized personnel only. <br/> 
          Connection logs are encrypted and stored in the Security Sector.
        </p>
      </div>
    </main>
  )
}
