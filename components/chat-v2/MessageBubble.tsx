"use client";

import { Message } from '@/types/chat-v2';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, RotateCcw, ThumbsUp, ThumbsDown, Check, AlertTriangle } from 'lucide-react';
import { memo, useState, useCallback } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
  index?: number;
  isSessionSwitching?: boolean;
  onRegenerate?: () => void;
}

type FeedbackState = 'none' | 'up' | 'down';

// ── Copy button with confirmation state ───────────────────────────────────────
function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handle = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available (e.g. HTTP context) — fall back silently
    }
  }, [content]);

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handle}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/8 transition-all touch-manipulation"
      title="Copy"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span key="check" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-emerald-500">
            <Check className="w-3 h-3" /> Copied
          </motion.span>
        ) : (
          <motion.span key="copy" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1">
            <Copy className="w-3 h-3" /> Copy
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ── Feedback buttons ──────────────────────────────────────────────────────────
function FeedbackButtons({ messageId }: { messageId: string }) {
  const [feedback, setFeedback] = useState<FeedbackState>('none');
  const [sending, setSending] = useState(false);

  const handleFeedback = useCallback(async (type: 'up' | 'down') => {
    if (feedback !== 'none' || sending) return;
    setSending(true);
    setFeedback(type);

    try {
      // POST to feedback API — best effort, don't block UI
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, type }),
      }).catch(() => {}); // Silently ignore if endpoint not yet implemented
    } finally {
      setSending(false);
    }
  }, [feedback, messageId, sending]);

  return (
    <div className="flex items-center gap-0.5">
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => handleFeedback('up')}
        disabled={feedback !== 'none'}
        className={`p-1.5 rounded-lg transition-all touch-manipulation ${
          feedback === 'up'
            ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
            : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-40'
        }`}
        title="Good response"
      >
        <ThumbsUp className="w-3 h-3" />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => handleFeedback('down')}
        disabled={feedback !== 'none'}
        className={`p-1.5 rounded-lg transition-all touch-manipulation ${
          feedback === 'down'
            ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
            : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40'
        }`}
        title="Bad response"
      >
        <ThumbsDown className="w-3 h-3" />
      </motion.button>
    </div>
  );
}

// ── Bot avatar ────────────────────────────────────────────────────────────────
function BotAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20 mt-0.5">
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </div>
  );
}

// ── Streaming cursor ──────────────────────────────────────────────────────────
function StreamingCursor() {
  return (
    <span
      className="inline-block w-0.5 h-4 rounded-full bg-violet-500 ml-0.5 align-text-bottom"
      style={{ animation: 'pulse 1s ease-in-out infinite' }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function MessageBubbleInner({
  message,
  index = 0,
  isSessionSwitching = false,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasError = message.content.startsWith('> ❌');

  return (
    <motion.div
      initial={!isSessionSwitching ? { opacity: 0, y: 10 } : {}}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: isSessionSwitching ? 0 : index * 0.03 }}
      className={`flex gap-2.5 md:gap-3 ${isUser ? 'justify-end' : 'justify-start'} w-full min-w-0`}
    >
      {/* Bot avatar */}
      {!isUser && <BotAvatar />}

      {/* Bubble + actions */}
      <div className={`flex flex-col min-w-0 ${
        isUser ? 'items-end max-w-[80%] md:max-w-[72%]' : 'items-start max-w-[88%] md:max-w-[78%]'
      }`}>

        {/* Bubble */}
        <div className={`w-full rounded-2xl px-4 py-3 md:px-5 md:py-3.5 ${
          isUser
            ? 'bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20'
            : hasError
              ? 'bg-red-50/80 dark:bg-red-950/20 border border-red-200/60 dark:border-red-800/30 backdrop-blur-sm'
              : 'bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/8 backdrop-blur-xl shadow-sm'
        }`}>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {message.attachments.map(att => (
                <div
                  key={att.id}
                  className={`flex items-center gap-2 p-2 rounded-xl ${
                    isUser ? 'bg-white/15' : 'bg-violet-50 dark:bg-violet-900/15'
                  }`}
                >
                  {att.type === 'image' ? (
                    <img src={att.url} alt={att.name} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isUser ? 'bg-white/25' : 'bg-violet-100 dark:bg-violet-800/50'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{att.name}</p>
                    <p className="text-[10px] opacity-60">{(att.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error icon */}
          {hasError && (
            <div className="flex items-center gap-1.5 mb-1.5 text-red-500">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-medium">Error</span>
            </div>
          )}

          {/* Message content */}
          <div className="min-w-0 w-full">
            {isUser ? (
              <p className="whitespace-pre-wrap text-sm md:text-[15px] leading-relaxed break-words">{message.content}</p>
            ) : message.isStreaming ? (
              <span className="text-gray-800 dark:text-gray-100 text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap">
                {message.content}
                <StreamingCursor />
              </span>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
          </div>
        </div>

        {/* Actions row (bot only, after stream completes) */}
        {!isUser && !message.isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-0.5 mt-1.5 px-1"
          >
            <CopyButton content={message.content} />

            {onRegenerate && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onRegenerate}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all touch-manipulation"
                title="Regenerate response"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Retry</span>
              </motion.button>
            )}

            <div className="w-px h-3.5 bg-gray-200 dark:bg-white/10 mx-0.5" />

            <FeedbackButtons messageId={message.id} />
          </motion.div>
        )}

        {/* Timestamp */}
        <div className={`text-[10px] text-gray-400 dark:text-gray-600 mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center shadow-sm mt-0.5 overflow-hidden">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>
      )}
    </motion.div>
  );
}

// Only re-render on content or streaming state change
export const MessageBubble = memo(MessageBubbleInner, (prev, next) =>
  prev.message.content === next.message.content &&
  prev.message.isStreaming === next.message.isStreaming &&
  prev.isSessionSwitching === next.isSessionSwitching
);
