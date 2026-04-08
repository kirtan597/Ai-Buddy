import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import User from '@/models/User';

export const maxDuration = 30;

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        await dbConnect();

        const user = await User.findOne({ email: session.user.email });

        if (!user) {
            return new NextResponse('User not found', { status: 404 });
        }

        // .lean() skips Mongoose document hydration — 2-5x faster for read-only lists
        const conversations = await Conversation.find({ userId: user._id })
            .sort({ updatedAt: -1 })
            .limit(50)
            .select('_id title createdAt updatedAt')   // only fields the sidebar needs
            .lean();

        return NextResponse.json(conversations, {
          headers: {
            // Serve stale instantly while revalidating in background (SWR pattern)
            'Cache-Control': 'private, max-age=0, stale-while-revalidate=30',
          },
        });
    } catch (error) {
        console.error('[CONVERSATIONS_GET]', error);
        // Return empty array on DB failure to allow UI to load
        return NextResponse.json([]);
    }
}
