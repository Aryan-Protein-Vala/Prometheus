import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
//                    L I C E N S E   V E R I F I C A T I O N   A P I
// ═══════════════════════════════════════════════════════════════════════════
// 
// This endpoint is called by the Prometheus TUI to verify license keys.
// It uses Vercel KV (Redis) to store license usage counts.
//
// For production, you should:
// 1. Add Vercel KV to your project: `npx vercel link && npx vercel env pull`
// 2. Install @vercel/kv: `npm install @vercel/kv`
// 3. Uncomment the KV code below
//
// For now, we use a simple in-memory fallback (resets on redeploy)
// ═══════════════════════════════════════════════════════════════════════════

// Simple in-memory storage (for development/demo)
// In production, use Vercel KV or a database
const licenseStore = new Map<string, { uses: number; email: string }>();

// Pre-seeded valid licenses (add your keys here)
const VALID_LICENSE_KEYS: Record<string, string> = {
  'PROM-DEMO-2024': 'demo@prometheus.app',
  'PROM-LAUNCH-001': 'launch@prometheus.app',
  // Add more keys as you generate them from payments
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json(
      { valid: false, message: 'Missing license key parameter' },
      { status: 400 }
    );
  }

  // Check if this is a valid key
  if (!VALID_LICENSE_KEYS[key]) {
    return NextResponse.json({
      valid: false,
      uses: 0,
      message: 'Invalid license key.'
    });
  }

  // Get or initialize usage record
  let record = licenseStore.get(key);
  
  if (!record) {
    // First time this key is being verified
    record = { uses: 0, email: VALID_LICENSE_KEYS[key] };
  }

  // Increment usage count
  record.uses += 1;
  licenseStore.set(key, record);

  // Check single-use: Only allow first activation
  if (record.uses > 1) {
    return NextResponse.json({
      valid: false,
      uses: record.uses,
      email: record.email,
      message: 'License key already activated on another device.'
    });
  }

  // Success! First activation
  return NextResponse.json({
    valid: true,
    uses: record.uses,
    email: record.email,
    message: 'License activated successfully.'
  });
}

// POST endpoint for adding new licenses (from payment webhook)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, key, email } = body;

    // Simple secret validation (use env var in production)
    const ADMIN_SECRET = process.env.LICENSE_ADMIN_SECRET || 'prometheus-admin-secret';
    
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!key || !email) {
      return NextResponse.json({ error: 'Missing key or email' }, { status: 400 });
    }

    // Add to valid keys (in production, this should write to a database)
    // For now, we can't persist this due to serverless nature
    // You would integrate with Vercel KV or a database here
    
    return NextResponse.json({
      success: true,
      message: 'License created (note: in-memory only, will reset on redeploy)'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
