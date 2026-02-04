import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
//                    L I C E N S E   V E R I F I C A T I O N   A P I
//                    (Works with or without Vercel KV)
// ═══════════════════════════════════════════════════════════════════════════
//
// This endpoint is called by the Prometheus TUI to verify license keys.
// If KV is configured, it uses persistent storage.
// If not, it falls back to in-memory storage (resets on redeploy).
//
// ═══════════════════════════════════════════════════════════════════════════

interface LicenseRecord {
  uses: number;
  email: string;
  createdAt: number;
  activatedAt?: number;
}

// In-memory fallback storage (for when KV isn't configured)
const memoryStore = new Map<string, LicenseRecord>();

// Key prefix for KV storage
const LICENSE_PREFIX = 'license:';

// Check if key is a valid format
function isValidKeyFormat(key: string): boolean {
  // PROM-XXXXX-XXXX format
  return /^PROM-[A-Z0-9]+-[A-Z0-9]+$/.test(key);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json(
      { valid: false, message: 'Missing license key parameter' },
      { status: 400 }
    );
  }

  console.log('License verification request for:', key);

  // Demo key always works
  if (key === 'PROM-DEMO-2024' || key === 'PROMETHEUS-DEMO-KEY') {
    return NextResponse.json({
      valid: true,
      uses: 1,
      email: 'demo@prometheus.app',
      message: 'Demo license activated.'
    });
  }

  // Check key format
  if (!isValidKeyFormat(key)) {
    return NextResponse.json({
      valid: false,
      uses: 0,
      message: 'Invalid license key format.'
    });
  }

  // Try KV first, fall back to memory
  let record: LicenseRecord | null = null;
  let useKV = false;

  try {
    const { kv } = await import('@vercel/kv');
    record = await kv.get<LicenseRecord>(`${LICENSE_PREFIX}${key}`);
    useKV = true;
    console.log('Using KV storage, found record:', !!record);
  } catch (kvError) {
    console.log('KV not available, using memory storage');
    record = memoryStore.get(key) || null;
  }

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

  // Save updated record
  try {
    if (useKV) {
      const { kv } = await import('@vercel/kv');
      await kv.set(`${LICENSE_PREFIX}${key}`, updatedRecord);
    } else {
      memoryStore.set(key, updatedRecord);
    }
  } catch (saveError) {
    console.error('Failed to save license update:', saveError);
  }

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
}

// POST endpoint for creating new licenses (called after successful payment)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, key, email } = body;

    // Validate admin secret
    const ADMIN_SECRET = process.env.LICENSE_ADMIN_SECRET || 'prometheus-admin-secret';
    
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!key || !email) {
      return NextResponse.json({ error: 'Missing key or email' }, { status: 400 });
    }

    const record: LicenseRecord = {
      uses: 0,
      email: email,
      createdAt: Date.now()
    };

    // Try KV first, fall back to memory
    try {
      const { kv } = await import('@vercel/kv');
      await kv.set(`${LICENSE_PREFIX}${key}`, record);
      console.log('License created in KV:', key);
    } catch (kvError) {
      memoryStore.set(key, record);
      console.log('License created in memory:', key);
    }

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
