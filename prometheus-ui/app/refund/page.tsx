import Link from "next/link"

export default function RefundPage() {
    return (
        <main className="relative min-h-screen bg-background">
            <div className="grain-overlay" />

            <div className="mx-auto max-w-3xl px-6 py-20">
                <Link
                    href="/"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    ← Back to Home
                </Link>

                <h1 className="mt-8 text-3xl font-bold tracking-tight">Refund Policy</h1>
                <p className="mt-2 text-muted-foreground">Last updated: February 4, 2026</p>

                <div className="mt-12 space-y-8 text-muted-foreground">
                    <section className="p-6 border border-border/50 bg-foreground/5 rounded-lg">
                        <h2 className="text-xl font-semibold text-foreground">No Refunds Policy</h2>
                        <p className="mt-3">
                            All sales of Prometheus licenses are <strong className="text-foreground">final and non-refundable</strong>.
                            Due to the digital nature of the product and instant license key delivery, we do not
                            offer refunds, returns, or exchanges.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">Why No Refunds?</h2>
                        <ul className="mt-3 space-y-3">
                            <li className="flex gap-3">
                                <span className="text-foreground">•</span>
                                <span>License keys are delivered instantly and cannot be "returned"</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-foreground">•</span>
                                <span>The Software is fully functional from the first use</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-foreground">•</span>
                                <span>You have access to the complete feature set immediately</span>
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">Before You Buy</h2>
                        <p className="mt-3">
                            We encourage you to:
                        </p>
                        <ul className="mt-3 space-y-2 list-disc list-inside">
                            <li>Review the features listed on our website</li>
                            <li>Check the system requirements for your platform</li>
                            <li>Read user reviews and documentation</li>
                            <li>Contact us with any questions before purchasing</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">Exceptions</h2>
                        <p className="mt-3">
                            We may consider exceptions only in the following rare cases:
                        </p>
                        <ul className="mt-3 space-y-2 list-disc list-inside">
                            <li>Duplicate purchases (accidental double payment)</li>
                            <li>Technical inability to run the Software due to our error</li>
                            <li>Payment fraud (handled by your bank)</li>
                        </ul>
                        <p className="mt-3">
                            Exception requests must be made within <strong className="text-foreground">24 hours</strong> of
                            purchase and are evaluated on a case-by-case basis.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">Support</h2>
                        <p className="mt-3">
                            If you're experiencing issues with the Software, please contact our support team
                            before assuming a refund is needed. We're happy to help resolve technical problems.
                        </p>
                        <p className="mt-3">
                            Contact:{" "}
                            <a href="mailto:support@prometheus-cleaner.com" className="text-foreground underline underline-offset-4">
                                support@prometheus-cleaner.com
                            </a>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">Chargebacks</h2>
                        <p className="mt-3">
                            Filing a chargeback without first contacting us may result in your license being
                            permanently revoked. Please reach out to us directly to resolve any issues.
                        </p>
                    </section>
                </div>

                <div className="mt-16 pt-8 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                        By purchasing Prometheus, you acknowledge that you have read and agree to this Refund Policy.
                    </p>
                </div>
            </div>
        </main>
    )
}
