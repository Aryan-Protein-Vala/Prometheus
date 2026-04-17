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

interface Plan {
    name: string
    price: number
}

export function PricingSection() {
    const sectionRef = useRef<HTMLElement>(null)
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [showEnterpriseContact, setShowEnterpriseContact] = useState(false)

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

    const openPayment = (plan: Plan) => {
        setSelectedPlan(plan)
    }

    return (
        <>
            <section id="pricing" ref={sectionRef} className="px-6 py-24 md:py-32 opacity-0">
                <div className="mx-auto max-w-5xl">
                    <div className="mb-16 text-center">
                        <span className="mb-4 inline-block text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            Enterprise Fleet Licensing
                        </span>
                        <h2 className="text-3xl font-medium tracking-tight text-white md:text-5xl">Select Your Protocol</h2>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2">
                        {/* Startup Card */}
                        <div className="group relative border border-white/5 bg-white/[0.02] p-8 md:p-10 transition-all hover:border-white/20">
                            <div className="mb-8 border-b border-white/5 pb-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-medium text-white">Startup Protocol</h3>
                                    <p className="text-xs uppercase tracking-widest text-neutral-500 mt-1">Up to 10 Devices</p>
                                </div>
                                <ShieldCheck className="w-8 h-8 text-neutral-800 group-hover:text-white transition-colors" />
                            </div>

                            <div className="mb-8">
                                <span className="text-4xl font-light text-white">₹4,999</span>
                                <span className="ml-2 text-neutral-500 uppercase text-[10px] tracking-widest">/ Month</span>
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
                                onClick={() => openPayment({ name: 'Startup Protocol', price: 4999 })}
                                className="w-full bg-transparent border border-white/10 text-white hover:bg-white/5 py-6 text-xs uppercase tracking-widest transition-all"
                            >
                                Secure Startup Fleet
                            </Button>
                        </div>

                        {/* Enterprise Card */}
                        <div className="group relative border border-white/20 bg-black p-8 md:p-10 shadow-[0_0_50px_rgba(255,255,255,0.02)] transition-all hover:border-white/40">
                            {/* Premium Badge */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-1 text-[10px] font-bold uppercase tracking-widest">
                                Most Deployed
                            </div>

                            <div className="mb-8 border-b border-white/10 pb-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-medium text-white">Agency / Enterprise</h3>
                                    <p className="text-xs uppercase tracking-widest text-neutral-500 mt-1">Unified Fleet Control</p>
                                </div>
                                <Zap className="w-8 h-8 text-white animate-pulse" />
                            </div>

                            <div className="mb-8">
                                <span className="text-4xl font-light text-white">₹999</span>
                                <span className="ml-2 text-neutral-500 uppercase text-[10px] tracking-widest">/ Seat / Month</span>
                                <p className="mt-2 text-[10px] text-neutral-600 font-mono tracking-tighter uppercase leading-relaxed">
                                    Enterprise scale with Master Password key <br />
                                    for IT Managers to lock configurations.
                                </p>
                            </div>

                            <ul className="mb-10 space-y-4">
                                {enterpriseFeatures.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-neutral-300">
                                        <Check className="h-4 w-4 text-white" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {showEnterpriseContact ? (
                                <div className="space-y-4 p-6 border border-white/20 bg-white/5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-mono">Bulk Licensing Protocol</p>
                                        <p className="text-sm font-medium text-white tracking-tight">Contact for Fleet Deployment</p>
                                    </div>
                                    <div className="space-y-2 pt-2 border-t border-white/10">
                                        <p className="text-lg font-light text-white tracking-widest">+91 9315465182</p>
                                        <p className="text-xs text-neutral-400 font-mono">aryansharma24112003@gmail.com</p>
                                    </div>
                                    <Button 
                                        onClick={() => setShowEnterpriseContact(false)}
                                        className="w-full mt-2 h-8 text-[9px] uppercase tracking-widest bg-transparent border border-white/10 text-neutral-500 hover:text-white transition-all"
                                    >
                                        Back to Plans
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    onClick={() => setShowEnterpriseContact(true)}
                                    className="w-full bg-white text-black hover:bg-neutral-200 py-6 text-xs uppercase font-bold tracking-[0.2em] shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                >
                                    Deploy to Fleet
                                </Button>
                            )}

                            <p className="mt-6 text-center text-[9px] text-neutral-700 font-mono tracking-tighter uppercase leading-relaxed">
                                License includes administrative audit rights per provisioned endpoint.
                            </p>
                        </div>
                    </div>

                    <p className="mt-16 text-center text-[10px] uppercase tracking-[0.3em] text-neutral-700">
                        Secure Enterprise Procurement via SSL Encryption
                    </p>
                </div>
            </section>

            {/* Payment Modal */}
            <PaymentModal 
                open={!!selectedPlan} 
                onOpenChange={(open) => !open && setSelectedPlan(null)} 
                planName={selectedPlan?.name || ''}
                amount={selectedPlan?.price || 0}
            />
        </>
    )
}
