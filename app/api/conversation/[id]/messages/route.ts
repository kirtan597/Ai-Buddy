import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import User from '@/models/User';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> } // Params are a Promise in Next.js 15+ (and 16)
) {
    try {
        const { id: conversationId } = await params;
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        await dbConnect();

        const user = await User.findOne({ email: session.user.email });

        if (!user) {
            return new NextResponse('User not found', { status: 404 });
        }

        // Verify ownership
        const conversation = await Conversation.findOne({
            _id: conversationId,
            userId: user._id,
        });

        if (!conversation) {
            return new NextResponse('Conversation not found', { status: 404 });
        }

        const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

        return NextResponse.json(messages);
    } catch (error) {
        console.error('[MESSAGES_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: conversationId } = await params;
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { role, content } = await req.json();

        if (!content) {
            return new NextResponse('Content is required', { status: 400 });
        }

        await dbConnect();

        const user = await User.findOne({ email: session.user.email });

        if (!user) {
            return new NextResponse('User not found', { status: 404 });
        }

        // Verify ownership
        const conversation = await Conversation.findOne({
            _id: conversationId,
            userId: user._id,
        });

        if (!conversation) {
            return new NextResponse('Conversation not found', { status: 404 });
        }

        const newMessage = await Message.create({
            conversationId,
            role,
            content,
        });

        // Update conversation updatedAt
        await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });

        return NextResponse.json(newMessage);
    } catch (error) {
        console.error('[MESSAGES_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
