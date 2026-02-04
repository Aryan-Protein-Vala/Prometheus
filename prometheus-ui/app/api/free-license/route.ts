import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
//                    F R E E   L I C E N S E   G E N E R A T I O N
// ═══════════════════════════════════════════════════════════════════════════
//
// This endpoint generates free license keys for users who provide their email.
// Emails are stored for product updates and user support.
//
// ═══════════════════════════════════════════════════════════════════════════

// Generate a unique license key
function generateLicenseKey(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 for clarity
    const segments = [];

    for (let i = 0; i < 4; i++) {
        let segment = "";
        for (let j = 0; j < 4; j++) {
            segment += chars[Math.floor(Math.random() * chars.length)];
        }
        segments.push(segment);
    }

    // Add a random suffix for uniqueness
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `PROM-${segments.join("-")}-${suffix}`;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        // Validate email
        if (!email || typeof email !== "string" || !email.includes("@")) {
            return NextResponse.json(
                { error: "Valid email is required" },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Try to check if email already has a license (using KV if available)
        try {
            const { kv } = await import('@vercel/kv');

            // Check existing license for this email
            const existingKey = await kv.get(`email:${normalizedEmail}`);
            if (existingKey) {
                console.log('Returning existing license for:', normalizedEmail);
                return NextResponse.json({ licenseKey: existingKey });
            }

            // Generate new license
            const licenseKey = generateLicenseKey();

            // Store email -> license mapping
            await kv.set(`email:${normalizedEmail}`, licenseKey);

            // Store license data
            await kv.set(`license:${licenseKey}`, {
                email: normalizedEmail,
                uses: 0,
                createdAt: Date.now(),
                source: 'free'
            });

            // Store in email list for updates
            await kv.lpush('email_list', JSON.stringify({
                email: normalizedEmail,
                licenseKey,
                createdAt: new Date().toISOString()
            }));

            console.log('Generated free license:', licenseKey, 'for:', normalizedEmail);
            return NextResponse.json({ licenseKey });

        } catch (kvError) {
            // KV not available - generate license anyway (just won't be stored)
            console.log('KV not available, generating ephemeral license');
            const licenseKey = generateLicenseKey();
            return NextResponse.json({ licenseKey });
        }

    } catch (error) {
        console.error("Free license error:", error);
        return NextResponse.json(
            { error: "Failed to generate license" },
            { status: 500 }
        );
    }
}
