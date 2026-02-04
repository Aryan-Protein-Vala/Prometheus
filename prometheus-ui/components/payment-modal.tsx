"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Loader2, CreditCard, Mail } from "lucide-react"

interface PaymentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function PaymentModal({ open, onOpenChange }: PaymentModalProps) {
    const [step, setStep] = useState<'email' | 'payment' | 'success'>('email')
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [licenseKey, setLicenseKey] = useState('')

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return
        setStep('payment')
    }

    const handlePayment = async () => {
        setIsLoading(true)

        // Simulate payment processing
        // In production, integrate with Stripe/Razorpay/Gumroad
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Generate a license key (in production, this comes from your backend after payment)
        const generatedKey = `PROM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        setLicenseKey(generatedKey)

        setIsLoading(false)
        setStep('success')
    }

    const copyLicenseKey = () => {
        navigator.clipboard.writeText(licenseKey)
    }

    const resetModal = () => {
        setStep('email')
        setEmail('')
        setLicenseKey('')
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card border-border">
                {step === 'email' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-medium">Get Prometheus</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Enter your email to receive your license key.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEmailSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-background border-border"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90">
                                Continue to Payment
                            </Button>
                        </form>
                    </>
                )}

                {step === 'payment' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-medium">Complete Payment</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Paying as {email}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                            {/* Order Summary */}
                            <div className="border border-border p-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Prometheus Founder Edition</span>
                                    <span className="text-foreground">$9</span>
                                </div>
                                <div className="border-t border-border pt-3 flex justify-between font-medium">
                                    <span>Total</span>
                                    <span>$9 USD</span>
                                </div>
                            </div>

                            {/* Payment Button */}
                            <Button
                                onClick={handlePayment}
                                disabled={isLoading}
                                className="w-full bg-foreground text-background hover:bg-foreground/90 py-6"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Pay $9
                                    </>
                                )}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground">
                                Secure payment. Your card details are never stored.
                            </p>
                        </div>
                    </>
                )}

                {step === 'success' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-medium flex items-center gap-2">
                                <Check className="h-5 w-5 text-green-500" />
                                Payment Successful!
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Your license key has been generated.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                            {/* License Key Display */}
                            <div className="border border-border bg-background p-4">
                                <Label className="text-xs text-muted-foreground">Your License Key</Label>
                                <div className="mt-2 flex items-center gap-2">
                                    <code className="flex-1 text-lg font-mono text-foreground bg-muted px-3 py-2 rounded">
                                        {licenseKey}
                                    </code>
                                    <Button variant="outline" size="sm" onClick={copyLicenseKey}>
                                        Copy
                                    </Button>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p className="font-medium text-foreground">Next Steps:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Download Prometheus from the command above</li>
                                    <li>Run <code className="bg-muted px-1">prometheus</code> in your terminal</li>
                                    <li>Enter your license key when prompted</li>
                                </ol>
                            </div>

                            <Button onClick={resetModal} className="w-full" variant="outline">
                                Done
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
