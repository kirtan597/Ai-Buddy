import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import User from '@/models/User';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { title } = await req.json();

        await dbConnect();

        const user = await User.findOne({ email: session.user.email });

        if (!user) {
            return new NextResponse('User not found', { status: 404 });
        }

        const newConversation = await Conversation.create({
            userId: user._id,
            title: title || 'New Conversation',
        });

        return NextResponse.json(newConversation);
    } catch (error) {
        console.error('[CONVERSATION_CREATE]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
