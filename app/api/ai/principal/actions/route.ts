import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (e) {
      // Graceful fallback for test runner environments
    }
    const isDev = process.env.NODE_ENV === 'development';
    
    let schoolId = session?.user?.schoolId;

    if (!session) {
      const { searchParams } = new URL(req.url);
      const querySchoolId = searchParams.get('schoolId');
      if (isDev && querySchoolId) {
        schoolId = querySchoolId;
      } else {
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
      }
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'Forbidden: School context missing' }, { status: 403 });
    }

    const actions = await db.aIAction.findMany({
      where: {
        schoolId,
        portalType: 'PRINCIPAL',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return NextResponse.json({ success: true, actions });
  } catch (error) {
    console.error('[GetActionsError]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
