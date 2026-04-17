"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Check, ShieldCheck, Zap } from "lucide-react"
import { PaymentModal } from "@/components/payment-modal"

const startupFeatures = [
    "Deep System Cleaning",
    "Up to 10 Secured Devices",
    "100% Offline Enforcer Daemon",
    "Local Admin Dashboard",
    "Security Audit Engine"
]

const enterpriseFeatures = [
    "Everything in Startup",
    "Unlimited Device Fleet",
    "Master Password Locking",
    "Custom Network Blocklists",
    "24/7 Enterprise Support",
    "Volume License Discount"
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
                <div className="mx-auto max-w-5xl">
                    <div className="mb-16 text-center">
                        <span className="mb-4 inline-block text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            Enterprise Fleet Licensing
                        </span>
                        <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-5xl">Select Your Protocol</h2>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2">
                        {/* Startup Card */}
                        <div className="group relative border border-border bg-card/50 p-8 md:p-10 transition-all hover:border-muted-foreground/30">
                            <div className="mb-8 border-b border-border pb-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-medium text-foreground">Startup Protocol</h3>
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Up to 10 Devices</p>
                                </div>
                                <ShieldCheck className="w-8 h-8 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                            </div>

                            <div className="mb-8">
                                <span className="text-4xl font-light text-foreground">₹4,999</span>
                                <span className="ml-2 text-muted-foreground uppercase text-[10px] tracking-widest">/ Month</span>
                            </div>

                            <ul className="mb-10 space-y-4">
                                {startupFeatures.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-neutral-400">
                                        <Check className="h-4 w-4 text-emerald-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                onClick={() => setLicenseModalOpen(true)}
                                className="w-full bg-transparent border border-border text-foreground hover:bg-white/5 py-6 text-xs uppercase tracking-widest transition-all"
                            >
                                Secure Startup Fleet
                            </Button>
                        </div>

                        {/* Enterprise Card */}
                        <div className="group relative border border-foreground/50 bg-black p-8 md:p-10 shadow-[0_0_50px_rgba(255,255,255,0.02)] transition-all hover:border-foreground">
                            {/* Premium Badge */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-1 text-[10px] font-bold uppercase tracking-widest">
                                Most Deployed
                            </div>

                            <div className="mb-8 border-b border-white/10 pb-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-medium text-white">Agency / Enterprise</h3>
                                    <p className="text-xs uppercase tracking-widest text-neutral-500 mt-1">Unified Fleet Control</p>
                                </div>
                                <Zap className="w-8 h-8 text-foreground animate-pulse" />
                            </div>

                            <div className="mb-8">
                                <span className="text-4xl font-light text-white">₹999</span>
                                <span className="ml-2 text-neutral-400 uppercase text-[10px] tracking-widest">/ Seat / Month</span>
                                <p className="mt-2 text-xs text-neutral-600 font-mono">* Volume discounts available for 50+ seats</p>
                            </div>

                            <ul className="mb-10 space-y-4">
                                {enterpriseFeatures.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-neutral-300">
                                        <Check className="h-4 w-4 text-white" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                onClick={() => setLicenseModalOpen(true)}
                                className="w-full bg-white text-black hover:bg-neutral-200 py-6 text-xs uppercase font-bold tracking-[0.2em] shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                            >
                                Deploy to Fleet
                            </Button>

                            <p className="mt-6 text-center text-[10px] text-neutral-600 font-mono tracking-tighter uppercase leading-relaxed">
                                Includes physical Master Password key for IT Managers <br />
                                to hard-lock daemon configurations.
                            </p>
                        </div>
                    </div>

                    <p className="mt-16 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40">
                        Secure Enterprise Procurement via SSL Encryption
                    </p>
                </div>
            </section>

            {/* Payment Modal */}
            <PaymentModal open={licenseModalOpen} onOpenChange={setLicenseModalOpen} />
        </>
    )
}
