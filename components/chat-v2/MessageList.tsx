"use client";

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/lib/chat-v2/chatStore';
import { useLenisScroll } from '@/hooks/useLenisScroll';
import { MessageBubble } from './MessageBubble';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

import { ChatState } from '@/types/chat-v2';

// Fine-grained selectors — only re-render when what we care about changes
const selectMessages = (s: ChatState) => s.currentSession?.messages;
const selectSessionId = (s: ChatState) => s.currentSession?.id;
const selectIsStreaming = (s: ChatState) => s.isStreaming;

export function MessageList() {
  // Subscribe to minimal slices of the store so streaming content updates
  // DON'T cause MessageList itself to re-render (MessageBubble.memo handles that)
  const messages = useChatStore(selectMessages);
  const sessionId = useChatStore(selectSessionId);
  const isStreaming = useChatStore(selectIsStreaming);

  const [isSessionSwitching, setIsSessionSwitching] = useState(false);
  const previousSessionIdRef = useRef<string | null>(null);

  const {
    scrollRef,
    scrollToBottom,
    forceScrollToBottom,
    shouldAutoScroll,
    isUserScrollingRef,
    isAtBottom,
  } = useLenisScroll({
    duration: 0.3,
    smooth: true,
    autoScroll: true,
    threshold: 120,
  });

  // ── Session switch detection ──────────────────────────────────────────────
  useEffect(() => {
    if (sessionId !== previousSessionIdRef.current) {
      setIsSessionSwitching(true);
      previousSessionIdRef.current = sessionId ?? null;
      const t = setTimeout(() => setIsSessionSwitching(false), 10);
      return () => clearTimeout(t);
    }
  }, [sessionId]);

  // Instant scroll when switching sessions
  useEffect(() => {
    if (isSessionSwitching && messages?.length) {
      scrollToBottom(false); // no animation
    }
  }, [isSessionSwitching, messages?.length, scrollToBottom]);

  // ── Auto-scroll: only when a NEW message bubble appears ──────────────────
  const messageCount = messages?.length ?? 0;
  useEffect(() => {
    if (messageCount === 0) return;
    // Only scroll if user hasn't scrolled up
    if (shouldAutoScroll.current && !isUserScrollingRef.current) {
      scrollToBottom(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageCount]);

  // ── Streaming auto-scroll: throttled via rAF ─────────────────────────────
  // We don't subscribe to content — instead we run a periodic check while streaming
  const streamingRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isStreaming) {
      if (streamingRafRef.current !== null) {
        cancelAnimationFrame(streamingRafRef.current);
        streamingRafRef.current = null;
      }
      return;
    }

    let lastScroll = 0;
    function tick(time: number) {
      // Throttle: scroll at most every 100ms
      if (time - lastScroll > 100) {
        if (shouldAutoScroll.current && !isUserScrollingRef.current) {
          scrollToBottom(true);
        }
        lastScroll = time;
      }
      streamingRafRef.current = requestAnimationFrame(tick);
    }
    streamingRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (streamingRafRef.current !== null) {
        cancelAnimationFrame(streamingRafRef.current);
        streamingRafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!messages?.length) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm md:max-w-md w-full"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2 md:mb-3">
            Start Your Conversation
          </h3>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4 md:mb-6 leading-relaxed">
            Ask me anything, upload images or documents, and let&apos;s have an intelligent conversation!
          </p>
          <div className="grid grid-cols-1 gap-2 md:gap-3 text-xs md:text-sm">
            <div className="p-2 md:p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-violet-200 dark:border-gray-700">
              <div className="font-medium text-violet-600 dark:text-violet-400 mb-1">💬 Ask Questions</div>
              <div className="text-gray-600 dark:text-gray-400">Get detailed answers</div>
            </div>
            <div className="p-2 md:p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-violet-200 dark:border-gray-700">
              <div className="font-medium text-violet-600 dark:text-violet-400 mb-1">📁 Upload Files</div>
              <div className="text-gray-600 dark:text-gray-400">Images &amp; documents</div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      {/* Lenis Scroll Container */}
      <div
        ref={scrollRef}
        className="h-full overscroll-none"
        style={{
          overflow: 'hidden',
          position: 'relative',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6 pb-32 md:pb-36 min-h-full">
          {messages.map((message: import('@/types/chat-v2').Message, index: number) => (
            <MessageBubble
              key={`${sessionId}-${message.id}`}
              message={message}
              index={index}
              isSessionSwitching={isSessionSwitching}
              onRegenerate={
                message.role === 'assistant' && index === messages.length - 1
                  ? () => useChatStore.getState().regenerateLastMessage?.()
                  : undefined
              }
            />
          ))}
          <div id="scroll-anchor" className="h-1" />
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      {!isSessionSwitching && (
        <AnimatePresence>
          {!isAtBottom && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={forceScrollToBottom}
              className="absolute bottom-4 right-4 md:bottom-6 md:right-6 p-3 bg-white dark:bg-gray-800 border border-violet-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm touch-manipulation"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-4 h-4 md:w-5 md:h-5 text-violet-600 dark:text-violet-400" />
            </motion.button>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}