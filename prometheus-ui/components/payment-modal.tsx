"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Loader2, CreditCard, Mail, Copy, CheckCircle2 } from "lucide-react"

// Declare Razorpay for TypeScript
declare global {
    interface Window {
        Razorpay: any;
    }
}

interface PaymentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function PaymentModal({ open, onOpenChange }: PaymentModalProps) {
    const [step, setStep] = useState<'email' | 'payment' | 'processing' | 'success'>('email')
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [licenseKey, setLicenseKey] = useState('')
    const [error, setError] = useState('')
    const [copied, setCopied] = useState(false)

    // Load Razorpay script
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        document.body.appendChild(script)
        return () => {
            document.body.removeChild(script)
        }
    }, [])

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return
        setError('')
        setStep('payment')
    }

    const handlePayment = async () => {
        setIsLoading(true)
        setError('')

        try {
            // Step 1: Create order
            console.log('Creating order for:', email)
            const orderResponse = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })

            const orderData = await orderResponse.json()
            console.log('Order response:', orderData)

            if (!orderData.success) {
                throw new Error(orderData.error || 'Failed to create order')
            }

            // Step 2: Open Razorpay checkout
            const options = {
                key: orderData.key,
                amount: orderData.order.amount,
                currency: orderData.order.currency,
                name: 'Prometheus',
                description: orderData.product,
                order_id: orderData.order.id,
                prefill: {
                    email: email
                },
                theme: {
                    color: '#000000'
                },
                handler: async (response: any) => {
                    // Step 3: Verify payment - This is called ONLY on successful payment
                    console.log('Payment successful, verifying:', response)
                    setStep('processing')

                    try {
                        const verifyResponse = await fetch('/api/payment/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                email: email
                            })
                        })

                        const verifyData = await verifyResponse.json()
                        console.log('Verify response:', verifyData)

                        if (verifyData.success) {
                            setLicenseKey(verifyData.licenseKey)
                            setStep('success')
                        } else {
                            throw new Error(verifyData.error || 'Payment verification failed')
                        }
                    } catch (verifyError: any) {
                        console.error('Verify error:', verifyError)
                        setError(verifyError.message)
                        setStep('payment')
                    }
                },
                modal: {
                    ondismiss: () => {
                        console.log('Razorpay modal dismissed')
                        setIsLoading(false)
                    }
                }
            }

            const razorpay = new window.Razorpay(options)
            
            // Handle payment failures (like the 500 error you're seeing)
            razorpay.on('payment.failed', (response: any) => {
                console.error('Payment failed:', response.error)
                setError(`Payment failed: ${response.error.description || response.error.reason || 'Unknown error'}`)
                setIsLoading(false)
            })
            
            razorpay.open()
            setIsLoading(false)

        } catch (err: any) {
            console.error('Payment error:', err)
            setError(err.message || 'Payment failed. Please try again.')
            setIsLoading(false)
        }
    }

    const copyLicenseKey = async () => {
        await navigator.clipboard.writeText(licenseKey)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const resetModal = () => {
        setStep('email')
        setEmail('')
        setLicenseKey('')
        setError('')
        setCopied(false)
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
                                    <span className="text-foreground">₹749</span>
                                </div>
                                <div className="border-t border-border pt-3 flex justify-between font-medium">
                                    <span>Total</span>
                                    <span>₹749</span>
                                </div>
                            </div>

                            {error && (
                                <div className="text-sm text-red-500 p-3 border border-red-500/20 rounded bg-red-500/10">
                                    {error}
                                </div>
                            )}

                            {/* Payment Button */}
                            <Button
                                onClick={handlePayment}
                                disabled={isLoading}
                                className="w-full bg-foreground text-background hover:bg-foreground/90 py-6"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Opening payment...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Pay ₹749
                                    </>
                                )}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground">
                                Secure payment via Razorpay. Cards, UPI, Wallets accepted.
                            </p>
                        </div>
                    </>
                )}

                {step === 'processing' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-medium">Verifying Payment...</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Please wait while we confirm your payment.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                        </div>
                    </>
                )}

                {step === 'success' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-medium flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
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
                                    <code className="flex-1 text-lg font-mono text-foreground bg-muted px-3 py-2 rounded break-all">
                                        {licenseKey}
                                    </code>
                                    <Button variant="outline" size="sm" onClick={copyLicenseKey}>
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p className="font-medium text-foreground">Next Steps:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Download Prometheus from the command above</li>
                                    <li>Run <code className="bg-muted px-1 rounded">prometheus</code> in your terminal</li>
                                    <li>Enter your license key when prompted</li>
                                </ol>
                            </div>

                            <p className="text-xs text-center text-muted-foreground">
                                A copy has also been sent to {email}
                            </p>

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
