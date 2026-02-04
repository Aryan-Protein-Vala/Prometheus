import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
//                    L I C E N S E   V E R I F I C A T I O N   A P I
//                    (FREE VERSION - Format validation only)
// ═══════════════════════════════════════════════════════════════════════════
//
// Since Prometheus is now FREE, this endpoint simply validates the license
// key format. Any properly formatted PROM- key is valid.
//
// ═══════════════════════════════════════════════════════════════════════════

// Check if key is a valid format
function isValidKeyFormat(key: string): boolean {
  // PROM-XXXX-XXXX-XXXX-XXXX-XX format (from free-license)
  // Must start with PROM-, contain alphanumeric and dashes, min 10 chars
  return /^PROM-[A-Z0-9-]+$/.test(key) && key.length >= 10;
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

  // Demo keys always work
  if (key === 'PROM-DEMO-2024' || key === 'PROMETHEUS-DEMO-KEY') {
    return NextResponse.json({
      valid: true,
      uses: 1,
      email: 'demo@prometheus.app',
      message: 'Demo license activated.'
    });
  }

  // Check key format - if format is valid, the key is valid (FREE version)
  if (!isValidKeyFormat(key)) {
    return NextResponse.json({
      valid: false,
      uses: 0,
      message: 'Invalid license key format. Keys should start with PROM-'
    });
  }

  // For FREE version: Any properly formatted key is valid!
  console.log('Valid license key format accepted:', key);

  return NextResponse.json({
    valid: true,
    uses: 1,
    email: 'free-user@prometheus.app',
    message: 'License activated successfully. Enjoy Prometheus!'
  });
}

// POST endpoint for admin operations (kept for backwards compatibility)
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

    // For free version, just acknowledge the request
    return NextResponse.json({
      success: true,
      key: key,
      message: 'License registered successfully.'
    });

  } catch (error) {
    console.error('Create license error:', error);
    return NextResponse.json({ error: 'Failed to create license' }, { status: 500 });
  }
}
