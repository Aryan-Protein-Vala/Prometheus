import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// ═══════════════════════════════════════════════════════════════════════════
//                    F L E E T   S Y N C   ( G E T   V E R S I O N )
// ═══════════════════════════════════════════════════════════════════════════
//
// This API is used by the Prometheus Enforcer to:
// 1. Fetch the latest Fleet Policy (blocklists) from the License source.
// 2. Ensure a single source of truth for the entire fleet.

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'License key is required' }, { status: 400 });
    }

    // 1. Find License and its Policy
    const license = await prisma.license.findUnique({
      where: { key: key }
    });

    if (!license) {
      return NextResponse.json({ error: 'Invalid License' }, { status: 404 });
    }

    // 2. Return Exact Sync Structure (Null-Safe)
    return NextResponse.json({
      blockedDomains: license.blockedDomains || [],
      blockedApps: license.blockedApps || [],
      blockedCategories: license.blockedCategories || [],
      blockUsb: license.blockUsb || false
    });

  } catch (error) {
    console.error('Fleet sync error:', error);
    return NextResponse.json({ error: 'Internal sync error' }, { status: 500 });
  }
}
