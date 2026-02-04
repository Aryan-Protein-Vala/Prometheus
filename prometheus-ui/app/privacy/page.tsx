import Link from "next/link"

export default function PrivacyPage() {
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

                <h1 className="mt-8 text-3xl font-bold tracking-tight">Privacy Policy</h1>
                <p className="mt-2 text-muted-foreground">Last updated: February 4, 2026</p>

                <div className="mt-12 space-y-8 text-muted-foreground">
                    <section>
                        <h2 className="text-xl font-semibold text-foreground">Our Commitment</h2>
                        <p className="mt-3">
                            Prometheus is designed with privacy as a core principle. The Software operates
                            <strong className="text-foreground"> 100% offline</strong>. No data from your computer
                            is ever transmitted to our servers or any third party.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">What We Don't Collect</h2>
                        <ul className="mt-3 space-y-2 list-disc list-inside">
                            <li>File names, paths, or contents from your computer</li>
                            <li>System information or hardware details</li>
                            <li>Usage patterns or analytics</li>
                            <li>Personal documents or media</li>
                            <li>Any data that leaves your device</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">What We Do Collect</h2>
                        <p className="mt-3">
                            When you purchase a license, we collect only what's necessary to process your payment:
                        </p>
                        <ul className="mt-3 space-y-2 list-disc list-inside">
                            <li><strong className="text-foreground">Email address</strong> — To send your license key and purchase receipt</li>
                            <li><strong className="text-foreground">Payment information</strong> — Processed securely by Razorpay/Gumroad (we don't store card details)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">License Verification</h2>
                        <p className="mt-3">
                            When you activate your license, the Software makes a one-time request to verify your
                            license key. This request contains only the license key itself — no other data from
                            your system is transmitted.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">Third-Party Services</h2>
                        <p className="mt-3">
                            We use trusted third-party services for payment processing:
                        </p>
                        <ul className="mt-3 space-y-2 list-disc list-inside">
                            <li><strong className="text-foreground">Razorpay</strong> — For Indian payments (see their privacy policy)</li>
                            <li><strong className="text-foreground">Gumroad</strong> — For international payments (see their privacy policy)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">Data Retention</h2>
                        <p className="mt-3">
                            We retain your email and license information only as long as necessary to provide
                            support and verify your license. You may request deletion of your data at any time
                            by contacting us.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">Updates to This Policy</h2>
                        <p className="mt-3">
                            We may update this Privacy Policy from time to time. We will notify users of any
                            significant changes via email or through the Software.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground">Contact</h2>
                        <p className="mt-3">
                            For privacy-related questions, contact us at{" "}
                            <a href="mailto:privacy@prometheus-cleaner.com" className="text-foreground underline underline-offset-4">
                                privacy@prometheus-cleaner.com
                            </a>
                        </p>
                    </section>
                </div>

                <div className="mt-16 pt-8 border-t border-border/50 bg-foreground/5 -mx-6 px-6 py-6">
                    <p className="text-sm font-medium text-foreground">
                        🔒 Zero Data Collection
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Prometheus is air-gapped by design. Your files never leave your device.
                    </p>
                </div>
            </div>
        </main>
    )
}
