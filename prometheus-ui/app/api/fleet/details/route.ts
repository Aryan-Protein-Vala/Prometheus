import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// ═══════════════════════════════════════════════════════════════════════════
//                    F L E E T   D E T A I L S   ( A D M I N )
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get('key');

    if (!licenseKey) {
      return NextResponse.json({ error: 'License key is required' }, { status: 400 });
    }

    // 1. Authenticate and Fetch
    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
      include: {
        devices: {
          orderBy: { lastSeen: 'desc' }
        },
        fleetPolicy: true
      }
    });

    if (!license) {
      return NextResponse.json({ error: 'Invalid License Key' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      email: license.email,
      devices: license.devices,
      policy: license.fleetPolicy || {
        blockedDomains: [],
        blockedApps: [],
        masterPassword: null
      }
    });

  } catch (error) {
    console.error('Fleet details fetch error:', error);
    return NextResponse.json({ error: 'Internal system error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
