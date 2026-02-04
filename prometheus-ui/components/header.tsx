"use client"

import { useState } from "react"
import { PaymentModal } from "@/components/payment-modal"

export function Header() {
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-40 px-4 md:px-6 py-4">
                <nav className="mx-auto max-w-7xl flex items-center justify-between">
                    {/* Logo/Brand */}
                    <a href="/" className="text-sm font-medium tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors uppercase">
                        Prometheus
                    </a>

                    {/* Right side buttons */}
                    <div className="flex items-center gap-3">
                        <a
                            href="https://github.com/Aryan-Protein-Vala/Prometheus"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            GitHub
                        </a>

                        <button
                            onClick={() => setPaymentModalOpen(true)}
                            className="px-4 py-2 text-xs font-medium tracking-wide bg-foreground text-background hover:bg-foreground/90 transition-all duration-200"
                        >
                            Get Licence
                        </button>
                    </div>
                </nav>
            </header>

            <PaymentModal open={paymentModalOpen} onOpenChange={setPaymentModalOpen} />
        </>
    )
}
