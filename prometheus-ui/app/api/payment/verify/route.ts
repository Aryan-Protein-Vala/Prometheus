import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
//                    R A Z O R P A Y   P A Y M E N T   V E R I F I C A T I O N
// ═══════════════════════════════════════════════════════════════════════════
//
// This endpoint verifies the payment signature and generates a license key.
// Storage is OPTIONAL - if KV/database isn't configured, it still works.
//
// ═══════════════════════════════════════════════════════════════════════════

// Generate a unique license key
function generateLicenseKey(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `PROM-${timestamp}-${random}`;
}

// Verify Razorpay signature
function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.warn('RAZORPAY_KEY_SECRET not set, skipping signature verification');
    return true; // Allow in dev mode without secret
  }

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

    console.log('Payment verification request:', { 
      orderId: razorpay_order_id, 
      paymentId: razorpay_payment_id,
      email 
    });

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !email) {
      console.error('Missing fields:', { razorpay_order_id, razorpay_payment_id, razorpay_signature, email });
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
      console.error('Invalid signature');
      return NextResponse.json(
        { error: 'Invalid payment signature. Payment verification failed.' },
        { status: 400 }
      );
    }

    // Generate license key - THIS ALWAYS HAPPENS after successful payment
    const licenseKey = generateLicenseKey();
    console.log('Generated license key:', licenseKey);

    // Try to store in KV if available (optional - doesn't block license generation)
    try {
      // Dynamic import to avoid build errors if @vercel/kv isn't installed
      const { kv } = await import('@vercel/kv');
      
      await kv.set(`license:${licenseKey}`, {
        uses: 0,
        email: email,
        createdAt: Date.now(),
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      });
      console.log('License stored in KV');
    } catch (kvError) {
      // KV not configured - that's okay, license still works
      console.log('KV storage skipped (not configured):', kvError);
    }

    // SUCCESS! Return the license key
    return NextResponse.json({
      success: true,
      licenseKey: licenseKey,
      email: email,
      message: 'Payment verified successfully. Your license key is ready!'
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment. Please contact support.' },
      { status: 500 }
    );
  }
}
