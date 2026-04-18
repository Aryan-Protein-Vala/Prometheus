import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// ═══════════════════════════════════════════════════════════════════════════
//                    F L E E T   P O L I C Y   U P D A T E
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseKey, blockedDomains, blockedApps, masterPassword } = body;

    if (!licenseKey) {
      return NextResponse.json({ error: 'License key is required' }, { status: 400 });
    }

    // 1. Authenticate with License Key
    const license = await prisma.license.findUnique({
      where: { key: licenseKey }
    });

    if (!license) {
      return NextResponse.json({ error: 'Unauthorized: Invalid License Key' }, { status: 401 });
    }

    // 2. Upsert the Fleet Policy
    const policy = await prisma.fleetPolicy.upsert({
      where: { licenseId: license.id },
      update: {
        blockedDomains: blockedDomains || [],
        blockedApps: blockedApps || [],
        masterPassword: masterPassword
      },
      create: {
        licenseId: license.id,
        blockedDomains: blockedDomains || [],
        blockedApps: blockedApps || [],
        masterPassword: masterPassword
      }
    });

    console.log(`[FLEET] Global Policy updated for organization: ${license.email}`);

    return NextResponse.json({
      success: true,
      message: 'Global Management Policy updated. Fleet will sync within 60 seconds.',
      policy
    });

  } catch (error) {
    console.error('Fleet policy update error:', error);
    return NextResponse.json({ error: 'Failed to update fleet policy' }, { status: 500 });
  }
}
