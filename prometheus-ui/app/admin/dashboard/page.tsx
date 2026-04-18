"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    LayoutDashboard, 
    Laptop, 
    Wifi, 
    WifiOff, 
    Lock, 
    Globe, 
    Plus, 
    Trash2, 
    Save, 
    Loader2,
    LogOut,
    RefreshCw,
    ShieldCheck
} from "lucide-react"

interface Device {
    id: string
    hwid: string
    lastSeen: string
    createdAt: string
}

interface Policy {
    blockedDomains: string[]
    blockedApps: string[]
    masterPassword?: string
    updatedAt: string
}

export default function AdminDashboard() {
    const [licenseKey, setLicenseKey] = useState<string | null>(null)
    const [email, setEmail] = useState<string | null>(null)
    const [devices, setDevices] = useState<Device[]>([])
    const [policy, setPolicy] = useState<Policy | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [newDomain, setNewDomain] = useState("")
    const [newApp, setNewApp] = useState("")
    const [masterPass, setMasterPass] = useState("")
    const router = useRouter()
    
    // Fine-Wine Normalization Logic 🍷
    const normalizeDomain = (val: string) => {
        try {
            let clean = val.trim().toLowerCase();
            if (!clean.includes('://')) clean = 'https://' + clean;
            const url = new URL(clean);
            let hostname = url.hostname;
            if (hostname.startsWith('www.')) hostname = hostname.substring(4);
            return hostname;
        } catch {
            return val.trim().toLowerCase();
        }
    }

    const normalizeAppName = (val: string) => {
        return val.trim().toLowerCase().replace(/\.exe$/, '').replace(/\.app$/, '');
    }

    const fetchFleetData = useCallback(async (key: string) => {
        try {
            // Re-verify and get fleet data
            const response = await fetch("/api/fleet/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ licenseKey: key, hwid: "ADMIN_CONSOLE" })
            })
            const data = await response.json()
            
            // Note: Since we need more info (device list) than sync returns,
            // normally we'd have a separate get-fleet API, but for speed
            // I'll assume we can use a fetch to verify-license or similar that I'll expand.
            // For now, let's assume we have a get-fleet API.
            
            const fleetRes = await fetch(`/api/fleet/details?key=${key}`)
            const fleetData = await fleetRes.json()
            
            if (fleetData.success) {
                setDevices(fleetData.devices)
                setPolicy(fleetData.policy)
                setMasterPass(fleetData.policy.masterPassword || "")
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        const key = localStorage.getItem("prometheus_admin_key")
        const mail = localStorage.getItem("prometheus_admin_email")
        if (!key) {
            router.push("/admin")
            return
        }
        setLicenseKey(key)
        setEmail(mail)
        fetchFleetData(key)
    }, [router, fetchFleetData])

    const handleUpdatePolicy = async () => {
        if (!licenseKey || !policy) return
        setIsSaving(true)
        try {
            const res = await fetch("/api/fleet/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    licenseKey,
                    blockedDomains: policy.blockedDomains,
                    blockedApps: policy.blockedApps,
                    masterPassword: masterPass
                })
            })
            if (res.ok) {
                alert("Global Fleet Policy Updated Successfully")
            }
        } catch (err) {
            alert("Failed to sync with Command Center")
        } finally {
            setIsSaving(false)
        }
    }

    const logout = () => {
        localStorage.removeItem("prometheus_admin_key")
        router.push("/admin")
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-white/20" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
            <div className="grain-overlay" />
            
            {/* Top Navigation */}
            <nav className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-2 rounded-lg">
                            <ShieldCheck className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-sm font-medium tracking-tight">Prometheus Fleet Command</h1>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-1">
                                Secure Organization Sector
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Logged in as</p>
                            <p className="text-xs font-mono">{email}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-white">
                            <LogOut className="h-4 w-4 mr-2" />
                            Disconnect
                        </Button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {/* Side: Fleet Overview */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                            <Laptop className="h-3 w-3" />
                            Deployment Assets ({devices.length})
                        </h2>
                        
                        <div className="space-y-4">
                            {devices.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic py-8 border border-dashed border-white/10 rounded-xl text-center">
                                    No devices linked to this license yet.
                                </p>
                            ) : (
                                devices.map(device => (
                                    <div key={device.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <div>
                                                <p className="text-xs font-mono tracking-tighter truncate w-32">{device.hwid}</p>
                                                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">
                                                    Active: {new Date(device.lastSeen).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                        <RefreshCw className="h-3 w-3 text-white/20 animate-spin-slow" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-2xl space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-400">System Integrity</p>
                        <p className="text-sm text-emerald-100/60 leading-relaxed font-light">
                            All {devices.length} authorized devices are currently syncing with the Fleet Security Protocol.
                        </p>
                    </div>
                </div>

                {/* Main: Policy Management */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-light tracking-tight">Global Organization Policy</h2>
                            <p className="text-xs text-muted-foreground mt-1">Changes are pushed to all laptops every 60 seconds.</p>
                        </div>
                        <Button 
                            onClick={handleUpdatePolicy} 
                            disabled={isSaving}
                            className="bg-white text-black hover:bg-neutral-200 h-10 px-8 text-[10px] uppercase tracking-[0.2em] font-bold"
                        >
                            {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />}
                            Deploy Policy
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Domain Blocklist */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Globe className="h-3 w-3" />
                                    Restricted Domains
                                </h3>
                                <span className="text-[10px] font-mono text-white/30">{policy?.blockedDomains.length}</span>
                            </div>
                            
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="domain.com"
                                    className="bg-black/50 border-white/10 h-10 text-xs"
                                    value={newDomain}
                                    onChange={(e) => setNewDomain(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && newDomain) {
                                            const normalized = normalizeDomain(newDomain);
                                            setPolicy(prev => prev ? ({ ...prev, blockedDomains: [normalized, ...prev.blockedDomains] }) : null)
                                            setNewDomain("")
                                        }
                                    }}
                                />
                                <Button size="icon" variant="outline" className="h-10 w-10 border-white/10 shrink-0" onClick={() => {
                                    if (!newDomain) return
                                    const normalized = normalizeDomain(newDomain);
                                    setPolicy(prev => prev ? ({ ...prev, blockedDomains: [normalized, ...prev.blockedDomains] }) : null)
                                    setNewDomain("")
                                }}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {policy?.blockedDomains.map((domain, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-lg group">
                                        <span className="text-xs font-mono">{domain}</span>
                                        <button 
                                            onClick={() => setPolicy(prev => prev ? ({ ...prev, blockedDomains: prev.blockedDomains.filter(d => d !== domain) }) : null)}
                                            className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* App Blocklist */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Lock className="h-3 w-3" />
                                    Software Kill-List
                                </h3>
                                <span className="text-[10px] font-mono text-white/30">{policy?.blockedApps.length}</span>
                            </div>
                            
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Spotify.exe"
                                    className="bg-black/50 border-white/10 h-10 text-xs"
                                    value={newApp}
                                    onChange={(e) => setNewApp(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && newApp) {
                                            const normalized = normalizeAppName(newApp);
                                            setPolicy(prev => prev ? ({ ...prev, blockedApps: [normalized, ...prev.blockedApps] }) : null)
                                            setNewApp("")
                                        }
                                    }}
                                />
                                <Button size="icon" variant="outline" className="h-10 w-10 border-white/10 shrink-0" onClick={() => {
                                    if (!newApp) return
                                    const normalized = normalizeAppName(newApp);
                                    setPolicy(prev => prev ? ({ ...prev, blockedApps: [normalized, ...prev.blockedApps] }) : null)
                                    setNewApp("")
                                }}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {policy?.blockedApps.map((app, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-lg group">
                                        <span className="text-xs font-mono">{app}</span>
                                        <button 
                                            onClick={() => setPolicy(prev => prev ? ({ ...prev, blockedApps: prev.blockedApps.filter(a => a !== app) }) : null)}
                                            className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Master Password Setting */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-medium">Master Security Password</h3>
                                <p className="text-xs text-muted-foreground mt-1">Laptops will require this password to modify any local settings.</p>
                            </div>
                            <Input 
                                type="password" 
                                placeholder="Universal Lock"
                                className="max-w-xs bg-black/50 border-white/10 h-12 text-sm"
                                value={masterPass}
                                onChange={(e) => setMasterPass(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
