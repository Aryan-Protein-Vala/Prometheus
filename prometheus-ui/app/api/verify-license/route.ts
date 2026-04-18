import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const hwid = searchParams.get('hwid');
  return await processVerification(key, hwid);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { key, hwid, email } = body;
  // If email is provided (from admin login), we just verify the key exists
  return await processVerification(key, hwid);
}

async function processVerification(key: string | null, hwid: string | null) {
  try {
    if (!key) {
      return NextResponse.json({ valid: false, message: 'Missing license key' }, { status: 400 });
    }

    const normalizedKey = key.trim().toUpperCase();

    // 1. Find License with Devices
    const license = await prisma.license.findUnique({
      where: { key: normalizedKey },
      include: { devices: true }
    });

    if (!license) {
      return NextResponse.json({ valid: false, message: 'Invalid license key.' });
    }

    // 2. Hardware-Aware Usage Detection
    const existingDevice = hwid ? license.devices.find(d => d.hwid === hwid) : null;
    
    if (!existingDevice && hwid && hwid !== "ADMIN_CONSOLE") {
        if (license.uses >= license.maxUses) {
            return NextResponse.json({
                valid: false,
                message: 'Device limit reached. Visit /admin to manage seats.'
            });
        }

        await prisma.device.create({
            data: { hwid, licenseId: license.id }
        });

        await prisma.license.update({
            where: { id: license.id },
            data: { uses: { increment: 1 } }
        });
    }

    return NextResponse.json({
        valid: true,
        email: license.email,
        message: 'Identity Verified.'
    });

  } catch (error) {
    console.error('License error:', error);
    return NextResponse.json({ error: 'Server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
