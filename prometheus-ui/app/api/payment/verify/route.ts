import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
//                    R A Z O R P A Y   P A Y M E N T   V E R I F I C A T I O N
// ═══════════════════════════════════════════════════════════════════════════
//
// This endpoint verifies the payment signature and creates a license key.
//
// ═══════════════════════════════════════════════════════════════════════════

interface LicenseRecord {
    uses: number;
    email: string;
    createdAt: number;
    paymentId: string;
    orderId: string;
}

const LICENSE_PREFIX = 'license:';

// Generate a unique license key
function generateLicenseKey(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `PROM-${timestamp}-${random}`;
}

// Verify Razorpay signature
function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return false;

    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

    return expectedSignature === signature;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            email
        } = body;

        // Validate required fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !email) {
            return NextResponse.json(
                { error: 'Missing required payment verification fields' },
                { status: 400 }
            );
        }

        // Verify payment signature
        const isValid = verifySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid payment signature. Payment verification failed.' },
                { status: 400 }
            );
        }

        // Generate license key
        const licenseKey = generateLicenseKey();

        // Store license in KV
        const licenseRecord: LicenseRecord = {
            uses: 0,
            email: email,
            createdAt: Date.now(),
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id
        };

        try {
            await kv.set(`${LICENSE_PREFIX}${licenseKey}`, licenseRecord);
        } catch (kvError) {
            console.error('KV storage error:', kvError);
            // Even if KV fails, we should return the license key
            // (they paid, so we must deliver)
        }

        return NextResponse.json({
            success: true,
            licenseKey: licenseKey,
            email: email,
            message: 'Payment verified successfully. Your license key is ready!'
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        return NextResponse.json(
            { error: 'Failed to verify payment' },
            { status: 500 }
        );
    }
}
