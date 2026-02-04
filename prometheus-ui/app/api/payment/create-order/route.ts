import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

// ═══════════════════════════════════════════════════════════════════════════
//                    R A Z O R P A Y   O R D E R   C R E A T I O N
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

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// Product configuration
const PRODUCT = {
  name: 'Prometheus Founder Edition',
  amount: 900, // Amount in smallest currency unit (₹9.00 = 900 paise, or $9 = 900 cents)
  currency: 'INR' // Change to 'USD' for dollars
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: 'Payment gateway not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: PRODUCT.amount,
      currency: PRODUCT.currency,
      receipt: `prometheus_${Date.now()}`,
      notes: {
        email: email,
        product: PRODUCT.name
      }
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      key: process.env.RAZORPAY_KEY_ID, // Public key for frontend
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
