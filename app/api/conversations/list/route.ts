import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import User from '@/models/User';

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

        const conversations = await Conversation.find({ userId: user._id })
            .sort({ updatedAt: -1 })
            .limit(50); // Limit to recent 50 for performance

        return NextResponse.json(conversations);
    } catch (error) {
        console.error('[CONVERSATIONS_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
