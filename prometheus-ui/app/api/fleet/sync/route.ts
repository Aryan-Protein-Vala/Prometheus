import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// ═══════════════════════════════════════════════════════════════════════════
//                    F L E E T   S Y N C   ( H E A R T B E A T )
// ═══════════════════════════════════════════════════════════════════════════
//
// This API is used by the Prometheus Enforcer to:
// 1. Register new devices without "burning" license uses twice.
// 2. Fetch the latest Fleet Policy (blocklists, master password).
// 3. Update the 'last seen' status of the machine.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseKey, hwid, machineName } = body;

    if (!licenseKey || !hwid) {
      return NextResponse.json({ error: 'License key and HWID are required' }, { status: 400 });
    }

    // 1. Find License
    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
      include: { 
        devices: true,
        fleetPolicy: true 
      }
    });

    if (!license) {
      return NextResponse.json({ valid: false, message: 'License key not recognized' }, { status: 404 });
    }

    // 2. Find or Register Device
    let device = license.devices.find(d => d.hwid === hwid);
    
    if (!device) {
      // Check device limit
      if (license.uses >= license.maxUses) {
        return NextResponse.json({ 
          valid: false, 
          message: 'Fleet capacity reached. Unauthorized device.' 
        }, { status: 403 });
      }

      // Register new device and increment usage
      device = await prisma.device.create({
        data: {
          hwid: hwid,
          licenseId: license.id
        }
      });

      await prisma.license.update({
        where: { id: license.id },
        data: { uses: { increment: 1 } }
      });
      
      console.log(`[FLEET] Registered new device ${hwid} for license ${licenseKey}`);
    } else {
      // Update last seen
      await prisma.device.update({
        where: { id: device.id },
        data: { lastSeen: new Date() }
      });
    }

    // 3. Prepare Policy Response
    // If no policy exists yet, create a default one
    let policy = license.fleetPolicy;
    if (!policy) {
      policy = await prisma.fleetPolicy.create({
        data: {
          licenseId: license.id,
          blockedDomains: [],
          blockedApps: []
        }
      });
    }

    return NextResponse.json({
      success: true,
      deviceId: device.id,
      policy: {
        blockedDomains: policy.blockedDomains,
        blockedApps: policy.blockedApps,
        masterPassword: policy.masterPassword,
        updatedAt: policy.updatedAt
      }
    });

  } catch (error) {
    console.error('Fleet sync error:', error);
    return NextResponse.json({ error: 'Internal system error during sync' }, { status: 500 });
  }
}
