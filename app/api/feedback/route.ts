import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    const { messageId, type } = await req.json();

    if (!messageId || !['up', 'down'].includes(type)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Best-effort DB update — doesn't block if DB is unreachable
    if (session?.user?.email) {
      try {
        await dbConnect();
        // Store feedback as a field on the Message document
        // (You may want to add a `feedback` field to the Message schema)
        await Message.findByIdAndUpdate(messageId, {
          $set: { feedback: type, feedbackAt: new Date() },
        });
      } catch (e) {
        console.error('[feedback] DB update failed:', e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[feedback] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
