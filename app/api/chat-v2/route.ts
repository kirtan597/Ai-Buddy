import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { generateImage, generateVideo } from '@/lib/media-generation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import User from '@/models/User';

// Tool definitions
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Generate an image based on a text description. Use this when the user asks to create, draw, or generate an image/picture/photo.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'A detailed description of the image to generate.',
          },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_video',
      description: 'Generate a short video based on a text description. Use this when the user asks to create, make, or generate a video/movie/clip.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'A detailed description of the video to generate.',
          },
        },
        required: ['prompt'],
      },
    },
  },
];

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = await getServerSession(authOptions);

    // Configure OpenAI client for OpenRouter
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Ai Buddy Chat',
      },
    });

    const formData = await request.formData();
    const message = formData.get('message') as string;
    const files = formData.getAll('files') as File[];
    const conversationId = formData.get('conversationId') as string;

    if (!message && files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message or files required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare content
    let userContent = message || '';
    if (files.length > 0) {
      const fileInfo = files.map(f => `[File: ${f.name} (${f.type})]`).join(' ');
      userContent = `${fileInfo} ${userContent}`;
    }

    // DB Operations: Verify User & Load History
    let isPersisted = false;
    let userId = null;
    let conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (session?.user?.email && conversationId) {
      try {
        await dbConnect();
        const user = await User.findOne({ email: session.user.email });
        if (user) {
          userId = user._id;
          const conv = await Conversation.findOne({ _id: conversationId, userId: user._id });
          if (conv) {
            isPersisted = true;

            // Fetch history BEFORE saving new message to avoid duplication in context
            const history = await Message.find({ conversationId })
              .sort({ createdAt: -1 })
              .limit(20);

            conversationHistory = history.reverse().map(m => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content
            }));

            // Save User Message
            await Message.create({
              conversationId,
              role: 'user',
              content: userContent
            });

            // Update conversation timestamp
            await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });
          }
        }
      } catch (e) {
        console.error('DB Error during request setup:', e);
      }
    }

    // Build Messages array
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are AI Buddy, a helpful and friendly AI assistant. You can generate images and videos using the available tools. When a tool returns a URL, present it clearly to the user.'
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userContent
      }
    ];

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Create readable stream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let currentToolCall: any = null;
        let toolCallArguments = "";
        let fullResponseContent = ""; // Track full response for DB

        try {
          for await (const chunk of stream) {
            // Handle Tool Calls
            const toolCall = chunk.choices[0]?.delta?.tool_calls?.[0];
            if (toolCall) {
              if (toolCall.id) {
                currentToolCall = toolCall;
                toolCallArguments = ""; // Reset args for new call
              }
              if (toolCall.function?.arguments) {
                toolCallArguments += toolCall.function.arguments;
              }
              continue; // Don't stream tool call bits to user as text
            }

            // Handle Normal Content
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullResponseContent += content;
              const data = JSON.stringify({ content });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // If we finished the stream and have a tool call to execute
          if (currentToolCall) {
            const functionName = currentToolCall.function?.name;
            let args;
            try {
              args = JSON.parse(toolCallArguments);
            } catch (e) {
              console.error("Failed to parse tool arguments", e);
            }

            if (args && functionName) {
              // Notify user we are generating
              const statusMsg = JSON.stringify({ content: `\n\n*Generating ${functionName === 'generate_image' ? 'image' : 'video'}...*\n\n` });
              controller.enqueue(encoder.encode(`data: ${statusMsg}\n\n`));

              let result;
              if (functionName === 'generate_image') {
                result = await generateImage(args.prompt);
              } else if (functionName === 'generate_video') {
                result = await generateVideo(args.prompt);
              }

              if (result) {
                let markdown = "";
                if (result.error) {
                  markdown = `\n> **Generation Failed**: ${result.error}\n`;
                } else if (result.url) {
                  if (functionName === 'generate_video') {
                    // Use video tag or simple link for video
                    markdown = `\n\n<video controls width="100%" src="${result.url}"></video>\n\n[Download Video](${result.url})`;
                  } else {
                    markdown = `\n\n![Generated Image](${result.url})\n\n`;
                  }
                }

                fullResponseContent += markdown;
                const openRouterData = JSON.stringify({ content: markdown });
                controller.enqueue(encoder.encode(`data: ${openRouterData}\n\n`));
              }
            }
          }

          // Save Assistant Message to DB
          if (isPersisted && fullResponseContent && conversationId) {
            try {
              await Message.create({
                conversationId,
                role: 'assistant',
                content: fullResponseContent
              });
              await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });
            } catch (e) { console.error('Failed to save assistant message', e); }
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