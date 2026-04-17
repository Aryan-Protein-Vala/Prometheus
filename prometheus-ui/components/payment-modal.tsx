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
    amount: number
    planName: string
}

export function PaymentModal({ open, onOpenChange, amount, planName }: PaymentModalProps) {
    const [step, setStep] = useState<'email' | 'payment' | 'processing' | 'success'>('email')
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [licenseKey, setLicenseKey] = useState('')
    const [error, setError] = useState('')
    const [copied, setCopied] = useState(false)
    // Internal open state to prevent parent from closing us during payment
    const [internalOpen, setInternalOpen] = useState(false)

    // Sync internal state with parent
    useEffect(() => {
        if (open) {
            setInternalOpen(true)
        }
    }, [open])

    // Handle dialog close - prevent closing during processing/success
    const handleOpenChange = (newOpen: boolean) => {
        if (step === 'processing') return
        if (step === 'success' && licenseKey && !newOpen) {
            resetModal()
            return
        }
        setInternalOpen(newOpen)
        if (!newOpen) {
            onOpenChange(false)
        }
    }

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
            // Step 1: Create order with dynamic amount and planName
            const orderResponse = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, amount, planName })
            })

            const orderData = await orderResponse.json()

            if (!orderData.success) {
                throw new Error(orderData.error || 'Failed to create order')
            }

            // Step 2: Open Razorpay checkout
            const options = {
                key: orderData.key,
                amount: orderData.order.amount,
                currency: orderData.order.currency,
                name: 'Prometheus Enterprise',
                description: orderData.product,
                order_id: orderData.order.id,
                prefill: { email: email },
                theme: { color: '#000000' },
                handler: async (response: any) => {
                    setInternalOpen(true)
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
                        if (verifyData.success && verifyData.licenseKey) {
                            setLicenseKey(verifyData.licenseKey)
                            setStep('success')
                            setInternalOpen(true)
                        } else {
                            throw new Error(verifyData.error || 'Payment verification failed')
                        }
                    } catch (verifyError: any) {
                        setError(verifyError.message)
                        setStep('payment')
                    }
                },
                modal: {
                    ondismiss: () => setIsLoading(false)
                }
            }

            const razorpay = new window.Razorpay(options)
            razorpay.on('payment.failed', (response: any) => {
                setError(`Payment failed: ${response.error.description || 'Unknown error'}`)
                setIsLoading(false)
            })
            razorpay.open()
            setIsLoading(false)

        } catch (err: any) {
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
        <Dialog open={internalOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
                {step === 'email' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-medium tracking-tight">Deploy {planName}</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Enter your organizational email to receive your enterprise key.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEmailSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    Corporate Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="it-manager@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-background border-border"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90 py-6 text-xs uppercase tracking-widest">
                                Continue to Settlement
                            </Button>
                        </form>
                    </>
                )}

                {step === 'payment' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-medium">Order Settlement</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Billing as {email}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                            <div className="border border-border p-5 bg-black/40 space-y-4">
                                <div className="flex justify-between text-xs tracking-widest uppercase">
                                    <span className="text-muted-foreground">{planName}</span>
                                    <span className="text-foreground">₹{amount.toLocaleString()}</span>
                                </div>
                                <div className="border-t border-border pt-4 flex justify-between font-mono text-sm">
                                    <span className="text-muted-foreground uppercase">Total Amount</span>
                                    <span className="text-white">₹{amount.toLocaleString()}</span>
                                </div>
                            </div>

                            {error && (
                                <div className="text-xs text-red-500 p-3 border border-red-500/20 rounded bg-red-500/10 font-mono">
                                    {error}
                                </div>
                            )}

                            <Button onClick={handlePayment} disabled={isLoading} className="w-full bg-white text-black hover:bg-neutral-200 py-7 text-xs font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Initing Gateway...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Settle ₹{amount.toLocaleString()}
                                    </>
                                )}
                            </Button>

                            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                                Secure B2B Settlement via Razorpay Enterprise
                            </p>
                        </div>
                    </>
                )}

                {step === 'processing' && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-6">
                        <Loader2 className="h-10 w-10 animate-spin text-white" />
                        <div className="text-center">
                            <p className="text-sm font-medium tracking-tight">Verifying Settlement...</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2">Connecting to Secure Node</p>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-medium flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                Protocol Authorized
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Your enterprise license key has been generated.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                            <div className="border border-border bg-black/60 p-5">
                                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Master Enterprise Key</Label>
                                <div className="mt-3 flex items-center gap-2">
                                    <code className="flex-1 text-base font-mono text-white bg-white/5 border border-white/5 px-4 py-3 rounded break-all tracking-tighter">
                                        {licenseKey}
                                    </code>
                                    <Button variant="outline" size="sm" onClick={copyLicenseKey} className="border-border hover:bg-white/5 h-12 w-12">
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3 p-4 bg-muted/20 border border-border">
                                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-foreground">Next Steps:</p>
                                <ol className="space-y-2">
                                    <li className="flex gap-3 text-xs text-muted-foreground">
                                        <span className="font-mono text-foreground/40">01.</span>
                                        <span>Run <code className="text-foreground">prometheus</code> and authorize with this key.</span>
                                    </li>
                                    <li className="flex gap-3 text-xs text-muted-foreground">
                                        <span className="font-mono text-foreground/40">02.</span>
                                        <span>Login to <code className="text-foreground">localhost:4444</code> for fleet control.</span>
                                    </li>
                                </ol>
                            </div>

                            <Button onClick={resetModal} className="w-full text-xs uppercase tracking-widest" variant="outline">
                                Complete Process
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
