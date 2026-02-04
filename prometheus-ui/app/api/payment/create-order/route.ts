import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
//                    R A Z O R P A Y   O R D E R   C R E A T I O N
//                    (Using REST API instead of SDK for Vercel compatibility)
// ═══════════════════════════════════════════════════════════════════════════
//
// SETUP REQUIRED:
// 1. Create Razorpay account: https://razorpay.com
// 2. Get API keys from Dashboard -> Settings -> API Keys
// 3. Add to Vercel Environment Variables:
//    - RAZORPAY_KEY_ID
//    - RAZORPAY_KEY_SECRET
//
// ═══════════════════════════════════════════════════════════════════════════

// Product configuration
const PRODUCT = {
  name: 'Prometheus Founder Edition',
  amount: 74900, // Amount in smallest currency unit (₹749.00 = 74900 paise)
  currency: 'INR'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if Razorpay is configured
    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Payment gateway not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Create Razorpay order using REST API
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: PRODUCT.amount,
        currency: PRODUCT.currency,
        receipt: `prometheus_${Date.now()}`,
        notes: {
          email: email,
          product: PRODUCT.name
        }
      })
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.error('Razorpay order error:', errorData);
      throw new Error('Failed to create order');
    }

    const order = await orderResponse.json();

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      key: keyId, // Public key for frontend
      product: PRODUCT.name
    });

  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
