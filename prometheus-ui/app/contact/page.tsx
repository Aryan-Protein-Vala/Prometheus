"use client"

import Link from "next/link"
import { useState } from "react"

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "general",
        message: ""
    })
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus("sending")

        // For now, just open mailto - can be replaced with actual form handling
        const mailtoLink = `mailto:aryansharma24112003@gmail.com?subject=${encodeURIComponent(
            `[${formData.subject}] ${formData.name}`
        )}&body=${encodeURIComponent(
            `From: ${formData.name} (${formData.email})\n\n${formData.message}`
        )}`

        window.location.href = mailtoLink
        setStatus("sent")
    }

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

                <h1 className="mt-8 text-3xl font-bold tracking-tight">Contact Us</h1>
                <p className="mt-2 text-muted-foreground">We'd love to hear from you</p>

                <div className="mt-12 grid md:grid-cols-2 gap-12">
                    {/* Contact Info */}
                    <div className="space-y-8">
                        <section>
                            <h2 className="text-lg font-semibold text-foreground">Email</h2>
                            <a
                                href="mailto:aryansharma24112003@gmail.com"
                                className="mt-2 block text-muted-foreground hover:text-foreground transition-colors"
                            >
                                aryansharma24112003@gmail.com
                            </a>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-foreground">Response Time</h2>
                            <p className="mt-2 text-muted-foreground">
                                We typically respond within 24-48 hours during business days.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-foreground">GitHub</h2>
                            <a
                                href="https://github.com/Aryan-Protein-Vala/Prometheus"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 block text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Report bugs or request features →
                            </a>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-foreground">Common Topics</h2>
                            <ul className="mt-3 space-y-2 text-muted-foreground text-sm">
                                <li>• License key issues</li>
                                <li>• Technical support</li>
                                <li>• Feature requests</li>
                                <li>• Business inquiries</li>
                                <li>• Press and partnerships</li>
                            </ul>
                        </section>
                    </div>

                    {/* Contact Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-foreground">
                                Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="mt-2 w-full px-4 py-3 bg-background border border-border/50 rounded-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-foreground">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="mt-2 w-full px-4 py-3 bg-background border border-border/50 rounded-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-foreground">
                                Subject
                            </label>
                            <select
                                id="subject"
                                value={formData.subject}
                                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                className="mt-2 w-full px-4 py-3 bg-background border border-border/50 rounded-none text-foreground focus:outline-none focus:border-foreground transition-colors"
                            >
                                <option value="general">General Inquiry</option>
                                <option value="support">Technical Support</option>
                                <option value="license">License Issue</option>
                                <option value="feature">Feature Request</option>
                                <option value="business">Business Inquiry</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-foreground">
                                Message
                            </label>
                            <textarea
                                id="message"
                                required
                                rows={5}
                                value={formData.message}
                                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                className="mt-2 w-full px-4 py-3 bg-background border border-border/50 rounded-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors resize-none"
                                placeholder="How can we help?"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === "sending"}
                            className="w-full px-6 py-3 bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
                        >
                            {status === "sending" ? "Opening email..." : status === "sent" ? "Email opened!" : "Send Message"}
                        </button>

                        <p className="text-xs text-muted-foreground text-center">
                            This will open your email client with a pre-filled message.
                        </p>
                    </form>
                </div>
            </div>
        </main>
    )
}
