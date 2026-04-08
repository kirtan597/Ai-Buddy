import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { generateImage, generateVideo } from '@/lib/media-generation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import User from '@/models/User';

export const maxDuration = 60;

// ── Simple in-memory rate limiter (resets on cold start) ──────────────────────
// For production, swap this map with Redis (Upstash) for persistence across instances
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute window
const RATE_LIMIT_MAX_AUTHENTICATED = 30; // 30 req/min for authenticated users
const RATE_LIMIT_MAX_GUEST = 3;          // 3 req/min for guests (belt & suspenders on top of client gate)

function getRateLimitKey(req: NextRequest, userId?: string): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  return userId ? `user:${userId}` : `ip:${ip}`;
}

function checkRateLimit(key: string, isAuthenticated: boolean): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const limit = isAuthenticated ? RATE_LIMIT_MAX_AUTHENTICATED : RATE_LIMIT_MAX_GUEST;
  let entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(key, entry);
  }

  entry.count++;
  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);
  const resetIn = Math.ceil((entry.resetAt - now) / 1000);

  // Cleanup old entries to prevent memory growth
  if (rateLimitMap.size > 10_000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }

  return { allowed, remaining, resetIn };
}

// ── Tool definitions ───────────────────────────────────────────────────────────
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description:
        'Generate an image from a text description. Use ONLY when the user explicitly asks to create, draw, or generate a visual image/picture/photo.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'A detailed, descriptive prompt for the image.',
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
      description:
        'Generate a short video from a text description. Use ONLY when the user explicitly asks to create or generate a video/clip.',
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

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are AI Buddy — a world-class problem-solver, senior engineer, and mentor. Your mission is to give the most useful, correct, and actionable answers possible.

## Core Identity
- You think deeply before answering. For complex problems, reason step-by-step.
- You prioritise correctness over brevity. Never guess — say "I'm not sure, but…" when uncertain.
- You match your depth to the question: short answers for simple questions, thorough breakdowns for hard ones.
- You proactively surface edge cases, gotchas, and trade-offs the user may not have considered.

## Problem-Solving Protocol
For technical problems (bugs, architecture, algorithms):
1. **Understand** — restate the core problem in one sentence
2. **Diagnose** — identify root cause(s) with evidence
3. **Solve** — provide the fix with working code
4. **Explain** — briefly explain *why* this fixes it
5. **Prevent** — suggest how to avoid the issue in future (optional but valuable)

For open-ended questions:
1. Answer the most useful interpretation directly
2. Mention important alternatives or nuances
3. End with what to explore next if the user wants to go deeper

## Response Formatting
Always use clean, well-structured Markdown:

- **Headings**: Use ## for major sections, ### for sub-sections. Never H1 in responses.
- **Code**: Always use fenced code blocks with the correct language tag (\`\`\`python, \`\`\`typescript, \`\`\`bash, etc.). Never paste code as plain text.
- **Inline code**: Use backticks for \`variable names\`, \`functions\`, \`commands\`, and \`file paths\`.
- **Lists**: Bullet points for unordered items; numbered lists for steps or ranked items.
- **Bold**: Key terms, important warnings, and emphasis.
- **Tables**: Use Markdown tables for comparative or structured data.
- **Blockquotes**: Use > for notes, warnings, tips, or important callouts.

## Tone
- Direct and confident — like a senior engineer pairing with you.
- Warm but efficient — no hollow filler phrases ("Great question!", "Certainly!", "Of course!").
- If a request is ambiguous, answer the most likely interpretation and state your assumption.

## Media Generation
When generating images or videos, briefly describe what you're creating before calling the tool.`;

// ── Token budget helper (rough approximation — no tokenizer dep needed) ────────
// Rule of thumb: 1 token ≈ 4 chars for English. We budget 100k tokens for history.
function trimHistory(
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  maxChars = 400_000  // ~100k tokens
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  let totalChars = 0;
  const trimmed: typeof history = [];

  // Walk backwards (newest first) to keep the most recent context
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const chars = typeof msg.content === 'string' ? msg.content.length : 0;
    if (totalChars + chars > maxChars) break;
    totalChars += chars;
    trimmed.unshift(msg);
  }

  return trimmed;
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured. Set OPENAI_API_KEY in environment variables.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = await getServerSession(authOptions);

    // ── Rate limiting ─────────────────────────────────────────────────────────
    const rateLimitKey = getRateLimitKey(request, session?.user?.email ?? undefined);
    const { allowed, remaining, resetIn } = checkRateLimit(rateLimitKey, !!session?.user);

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${resetIn}s.` }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'Retry-After': String(resetIn),
          },
        }
      );
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'https://kbotai.netlify.app',
        'X-Title': 'AI Buddy Chat',
      },
    });

    const formData = await request.formData();
    const message = formData.get('message') as string;
    const files = formData.getAll('files') as File[];
    const conversationId = formData.get('conversationId') as string;
    const modelOverride = (formData.get('model') as string) || 'openai/gpt-4o-mini';

    // Validate model is an allowed OpenRouter model ID
    const ALLOWED_MODELS = new Set([
      'openai/gpt-4o-mini',
      'openai/gpt-4o',
      'anthropic/claude-3.5-haiku',
      'google/gemini-flash-1.5',
    ]);
    const model = ALLOWED_MODELS.has(modelOverride) ? modelOverride : 'openai/gpt-4o-mini';

    if (!message && files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message or files required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let userContent = message || '';
    if (files.length > 0) {
      const fileInfo = files.map(f => `[Attached file: ${f.name} (${f.type}, ${(f.size / 1024).toFixed(1)}KB)]`).join('\n');
      userContent = fileInfo + (userContent ? '\n\n' + userContent : '');
    }

    // ── DB operations ─────────────────────────────────────────────────────────
    let conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (session?.user?.email && conversationId) {
      try {
        await dbConnect();
        const user = await User.findOne({ email: session.user.email });
        if (user) {
          // Find or atomically create conversation to prevent E11000 race conditions
          let conv = null;
          try {
            conv = await Conversation.findOneAndUpdate(
              { _id: conversationId },
              { 
                $setOnInsert: { 
                  userId: user._id, 
                  title: userContent.slice(0, 60) || 'New Chat' 
                } 
              },
              { upsert: true, new: true }
            );
          } catch (e: any) {
            if (e.code === 11000) {
              // Concurrency fallback
              conv = await Conversation.findOne({ _id: conversationId });
            } else {
              console.error('[chat-v2] Failed to upsert conversation:', e);
            }
          }

          if (conv && conv.userId.toString() !== user._id.toString()) {
            // Privacy protection: if session ID collided with another user's (e.g. guest logged in as different account)
            console.error('[chat-v2] Notice: userId mismatch for conversation', conversationId);
            conversationHistory = [];
          } else if (conv) {
            // Fetch history (last 40 messages for better context)
            try {
              const history = await Message.find({ conversationId })
                .sort({ createdAt: -1 })
                .limit(40);

              const rawHistory = history.reverse().map(m => ({
                role: m.role as 'user' | 'assistant' | 'system',
                content: m.content,
              }));

              conversationHistory = trimHistory(rawHistory);
            } catch (e) {
              console.error('[chat-v2] Failed to fetch history:', e);
            }
          }

          // Save user message (fire-and-forget — don't block the stream)
          Message.create({ conversationId, role: 'user', content: userContent }).catch(e =>
            console.error('[chat-v2] Failed to save user message:', e)
          );
          Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() }).catch(() => {});
        }
      } catch (e) {
        console.error('[chat-v2] DB setup error (proceeding):', e);
      }
    }

    // ── Build messages array ──────────────────────────────────────────────────
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userContent },
    ];

    // ── Streaming response ────────────────────────────────────────────────────
    const stream = await openai.chat.completions.create({
      model,  // from request — validated against allowlist above
      messages,
      tools,
      tool_choice: 'auto',
      stream: true,
      temperature: 0.7,
      max_tokens: 4096,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        let currentToolCall: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall | null = null;
        let toolCallArguments = '';
        let fullResponseContent = '';

        // SSE heartbeat to prevent Netlify/Vercel from killing idle connections
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch {
            clearInterval(heartbeatInterval);
          }
        }, 15_000);

        try {
          for await (const chunk of stream) {
            const toolCall = chunk.choices[0]?.delta?.tool_calls?.[0];
            if (toolCall) {
              if (toolCall.id) {
                currentToolCall = toolCall;
                toolCallArguments = '';
              }
              if (toolCall.function?.arguments) {
                toolCallArguments += toolCall.function.arguments;
              }
              continue;
            }

            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullResponseContent += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }

            // Handle finish_reason
            const finishReason = chunk.choices[0]?.finish_reason;
            if (finishReason === 'length') {
              const notice = '\n\n> ⚠️ **Response truncated** — the output reached the token limit. Ask me to continue if needed.';
              fullResponseContent += notice;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: notice })}\n\n`));
            }
          }

          // ── Tool call execution ─────────────────────────────────────────────
          if (currentToolCall) {
            const functionName = currentToolCall.function?.name;
            let args: Record<string, string> | undefined;
            try {
              args = JSON.parse(toolCallArguments);
            } catch {
              console.error('[chat-v2] Failed to parse tool args');
            }

            if (args && functionName) {
              const statusMsg = `\n\n*⏳ Generating ${functionName === 'generate_image' ? 'image' : 'video'}…*\n\n`;
              fullResponseContent += statusMsg;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: statusMsg })}\n\n`));

              try {
                let result: { url?: string; error?: string } | undefined;
                if (functionName === 'generate_image') {
                  result = await generateImage(args.prompt);
                } else if (functionName === 'generate_video') {
                  result = await generateVideo(args.prompt);
                }

                if (result) {
                  let markdown = '';
                  if (result.error) {
                    markdown = `\n> ❌ **Generation failed**: ${result.error}\n`;
                  } else if (result.url) {
                    markdown =
                      functionName === 'generate_video'
                        ? `\n\n<video controls width="100%" src="${result.url}"></video>\n\n[Download video](${result.url})`
                        : `\n\n![Generated image](${result.url})\n\n`;
                  }
                  fullResponseContent += markdown;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: markdown })}\n\n`));
                }
              } catch (toolErr) {
                console.error('[chat-v2] Tool execution error:', toolErr);
                const errMsg = '\n\n> ❌ **Tool failed** — unable to generate media right now.\n';
                fullResponseContent += errMsg;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: errMsg })}\n\n`));
              }
            }
          }

          // ── Persist assistant message ───────────────────────────────────────
          if (fullResponseContent && conversationId && session?.user?.email) {
            Message.create({ conversationId, role: 'assistant', content: fullResponseContent }).catch(e =>
              console.error('[chat-v2] Failed to save assistant message:', e)
            );
            Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() }).catch(() => {});
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('[chat-v2] Streaming error:', error);
          const errMsg = '\n\n> ❌ **Something went wrong** — please try again.';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: errMsg })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } finally {
          clearInterval(heartbeatInterval);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store',
        'Connection': 'keep-alive',
        'X-RateLimit-Remaining': String(remaining),
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      },
    });
  } catch (error) {
    console.error('[chat-v2] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
