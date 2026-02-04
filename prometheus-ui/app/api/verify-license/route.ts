import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// ═══════════════════════════════════════════════════════════════════════════
//                    L I C E N S E   V E R I F I C A T I O N   A P I
//                    (With Vercel KV Persistent Storage)
// ═══════════════════════════════════════════════════════════════════════════
//
// This endpoint is called by the Prometheus TUI to verify license keys.
// It uses Vercel KV (Redis) to store license usage counts.
//
// SETUP REQUIRED:
// 1. Go to Vercel Dashboard -> Storage -> Create KV Database
// 2. Environment variables will be auto-added (KV_REST_API_URL, KV_REST_API_TOKEN)
//
// ═══════════════════════════════════════════════════════════════════════════

interface LicenseRecord {
  uses: number;
  email: string;
  createdAt: number;
  activatedAt?: number;
}

// Key prefix for KV storage
const LICENSE_PREFIX = 'license:';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json(
      { valid: false, message: 'Missing license key parameter' },
      { status: 400 }
    );
  }

  try {
    // Try to get license from KV storage
    const record = await kv.get<LicenseRecord>(`${LICENSE_PREFIX}${key}`);

    if (!record) {
      return NextResponse.json({
        valid: false,
        uses: 0,
        message: 'Invalid license key.'
      });
    }

    // Increment usage count
    const newUses = record.uses + 1;
    const updatedRecord: LicenseRecord = {
      ...record,
      uses: newUses,
      activatedAt: record.activatedAt || Date.now()
    };

    await kv.set(`${LICENSE_PREFIX}${key}`, updatedRecord);

    // Check single-use: Only allow first activation
    if (newUses > 1) {
      return NextResponse.json({
        valid: false,
        uses: newUses,
        email: record.email,
        message: 'License key already activated on another device.'
      });
    }

    // Success! First activation
    return NextResponse.json({
      valid: true,
      uses: newUses,
      email: record.email,
      message: 'License activated successfully.'
    });

  } catch (error) {
    console.error('KV Error:', error);

    // Fallback: If KV is not configured, use in-memory demo mode
    if (key === 'PROM-DEMO-2024') {
      return NextResponse.json({
        valid: true,
        uses: 1,
        email: 'demo@prometheus.app',
        message: 'Demo license activated.'
      });
    }

    return NextResponse.json({
      valid: false,
      message: 'License server temporarily unavailable.'
    }, { status: 500 });
  }
}

// POST endpoint for creating new licenses (called after successful payment)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, key, email } = body;

    // Validate admin secret (set this in Vercel Environment Variables)
    const ADMIN_SECRET = process.env.LICENSE_ADMIN_SECRET || 'prometheus-admin-secret';

    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!key || !email) {
      return NextResponse.json({ error: 'Missing key or email' }, { status: 400 });
    }

    // Create license in KV storage
    const record: LicenseRecord = {
      uses: 0,
      email: email,
      createdAt: Date.now()
    };

    await kv.set(`${LICENSE_PREFIX}${key}`, record);

    return NextResponse.json({
      success: true,
      key: key,
      message: 'License created successfully.'
    });

  } catch (error) {
    console.error('Create license error:', error);
    return NextResponse.json({ error: 'Failed to create license' }, { status: 500 });
  }
}
