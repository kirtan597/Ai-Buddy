import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import User from '@/models/User';
import { nanoid } from 'nanoid';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body: { title?: string } = {};
        try {
            body = await req.json();
        } catch {
            // Body might be empty or malformed — use defaults
        }

        await dbConnect();

        const user = await User.findOne({ email: session.user.email });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Generate a unique string ID for the conversation
        const conversationId = nanoid();

        const newConversation = await Conversation.create({
            _id: conversationId,
            userId: user._id,
            title: body.title || 'New Chat',
        });

        // Return with both _id and id for frontend compatibility
        return NextResponse.json({
            ...newConversation.toObject(),
            id: newConversation._id,
        });
    } catch (error) {
        console.error('[CONVERSATION_CREATE]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
