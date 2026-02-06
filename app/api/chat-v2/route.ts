import OpenAI from 'openai';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Configure OpenAI client for OpenRouter
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Buddy Chat',
      },
    });

    const formData = await request.formData();
    const message = formData.get('message') as string;
    const files = formData.getAll('files') as File[];

    if (!message && files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message or files required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare messages
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are AI Buddy, a helpful and friendly AI assistant. Provide clear, accurate, and helpful responses to user queries. Be conversational and supportive.'
      }
    ];

    // Handle message and files
    let userContent = message || '';
    
    if (files.length > 0) {
      const fileInfo = files.map(f => `[File: ${f.name} (${f.type})]`).join(' ');
      userContent = `${fileInfo} ${userContent}`;
    }

    messages.push({
      role: 'user',
      content: userContent
    });

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Create readable stream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              const data = JSON.stringify({ content });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({ error: 'Failed to generate response' });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: 'API error: ' + (error as Error).message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}