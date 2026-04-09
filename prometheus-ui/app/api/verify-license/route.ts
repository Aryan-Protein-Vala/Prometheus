import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
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

    // Direct DB verification
    const license = await prisma.license.findUnique({
      where: { key: key.trim() }
    });

    if (!license) {
      return NextResponse.json({
        valid: false,
        uses: 0,
        message: 'Invalid or unrecognized license key.'
      });
    }

    if (license.uses >= license.maxUses) {
      return NextResponse.json({
        valid: false,
        uses: license.uses,
        message: 'Device limit reached for this license key.'
      });
    }

    const updatedLicense = await prisma.license.update({
        where: { id: license.id },
        data: { uses: { increment: 1 } }
    });

    return NextResponse.json({
        valid: true,
        uses: updatedLicense.uses,
        email: updatedLicense.email,
        message: 'License activated successfully. Enjoy Prometheus PRO!'
    });

  } catch (error) {
    console.error('License verification error:', error);
    return NextResponse.json({ error: 'Server error during verification' }, { status: 500 });
  }
}
