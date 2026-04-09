import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '../../../../lib/prisma';

// Generate PROM-XXXX-XXXX-XXXX-XXXX
function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'PROM-';
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (i < 3) key += '-';
    }
    return key;
}

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const signature = req.headers.get('x-razorpay-signature');
        
        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
            console.error("RAZORPAY_WEBHOOK_SECRET is not set");
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');

        if (expectedSignature !== signature) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const event = JSON.parse(body);

        if (event.event === 'payment.captured' || event.event === 'order.paid') {
            // Note: payload structure depends on exact event type from razorpay webhook,
            // we safely navigate both common structures.
            const paymentEmail = event.payload?.payment?.entity?.email;
            const orderEmail = event.payload?.order?.entity?.email;
            const email = paymentEmail || orderEmail;
            
            if (!email) {
                 return NextResponse.json({ error: 'No email found in event payload' }, { status: 400 });
            }

            const licenseKey = generateLicenseKey();

            // Insert into Prisma Database
            await prisma.license.create({
                data: {
                    key: licenseKey,
                    email: email.toLowerCase().trim(),
                    source: 'razorpay',
                    maxUses: 2 // Paid standard
                }
            });

            console.log(`Generated and stored PRO license ${licenseKey} for ${email}`);
        }

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
