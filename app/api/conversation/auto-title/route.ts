import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/models/Conversation';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, firstMessage } = await req.json();
    if (!conversationId || !firstMessage) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key missing' }, { status: 500 });

    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'https://kbotai.netlify.app',
        'X-Title': 'AI Buddy Chat',
      },
    });

    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate a short 3-5 word title for this conversation. Return ONLY the title, no quotes, no punctuation at the end.',
        },
        { role: 'user', content: firstMessage.slice(0, 300) },
      ],
      max_tokens: 20,
      temperature: 0.5,
    });

    const title = completion.choices[0]?.message?.content?.trim() || firstMessage.slice(0, 40);

    // Update in DB (fire-and-forget safe — if it fails the UI already shows the title)
    await dbConnect();
    await Conversation.findOneAndUpdate({ _id: conversationId }, { title }).catch(() => {});

    return NextResponse.json({ title });
  } catch (err) {
    console.error('[auto-title]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
