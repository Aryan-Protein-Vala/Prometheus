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

        // ═══════════════════════════════════════════════════════════════════════════
        // GOOGLE FORMS INTEGRATION
        // ═══════════════════════════════════════════════════════════════════════════
        // Form ID: 1FAIpQLSfXmhbTJy-bA87vvC0uQV8mdNrmuSlK1SS50xAdNg7iIjG90g
        // Field ID: entry.1292085204

        const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfXmhbTJy-bA87vvC0uQV8mdNrmuSlK1SS50xAdNg7iIjG90g/formResponse";
        const EMAIL_FIELD_ID = "entry.1292085204";

        try {
            // Silently submit to Google Forms
            // We use no-cors mode logic implicitly by just sending the POST and ignoring the response structure
            // effectively since we are server-side we can just fetch.

            const formData = new URLSearchParams();
            formData.append(EMAIL_FIELD_ID, normalizedEmail);
            formData.append("submit", "Submit");

            // Fire and forget - don't await strictly or block specific error handling
            // We want the user to get their license regardless of the sheet status
            fetch(GOOGLE_FORM_URL, {
                method: "POST",
                mode: "no-cors", // Not needed server-side but good practice to keep in mind constraints
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData.toString(),
            }).catch(err => console.error("Failed to save email to sheet:", err));

        } catch (sheetError) {
            console.error("Sheet integration error:", sheetError);
        }

        // Generate license key
        const licenseKey = generateLicenseKey();

        console.log('Generated free license:', licenseKey, 'for:', normalizedEmail);
        return NextResponse.json({ licenseKey });

    } catch (error) {
        console.error("Free license error:", error);
        return NextResponse.json(
            { error: "Failed to generate license" },
            { status: 500 }
        );
    }
}
