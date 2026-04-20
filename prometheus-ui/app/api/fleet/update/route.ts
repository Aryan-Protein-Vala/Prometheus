import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// ═══════════════════════════════════════════════════════════════════════════
//                    F L E E T   P O L I C Y   U P D A T E
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    const body = await request.json();
    const { blockedDomains, blockedApps } = body;

    if (!key) {
      return NextResponse.json({ error: 'License key is required' }, { status: 400 });
    }

    // 1. Update the License Model directly (Single Source of Truth)
    const updatedLicense = await prisma.license.update({
      where: { key: key },
      data: {
        blockedDomains: blockedDomains || [],
        blockedApps: blockedApps || []
      }
    });

    console.log(`[FLEET] Cloud Policy synchronized for License: ${key}`);

    return NextResponse.json({
      success: true,
      message: 'Cloud Policy Updated. All fleet instances will synchronize automatically.',
      policy: {
        blockedDomains: updatedLicense.blockedDomains,
        blockedApps: updatedLicense.blockedApps
      }
    });

  } catch (error) {
    console.error('Fleet policy update error:', error);
    return NextResponse.json({ error: 'Failed to synchronize cloud policy' }, { status: 500 });
  }
}
