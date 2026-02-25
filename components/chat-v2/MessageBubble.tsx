"use client";

import { Message } from '@/types/chat-v2';
import { motion } from 'framer-motion';
import { Copy, User, Bot, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { memo, useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
  index?: number;
  isSessionSwitching?: boolean;
}

function MessageBubbleInner({ message, index = 0, isSessionSwitching = false }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const shouldAnimate = !isSessionSwitching;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-2 md:gap-3 ${isUser ? 'justify-end' : 'justify-start'} w-full min-w-0`}>

      {/* Bot avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 md:w-9 md:h-9 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md mt-0.5">
          <Bot className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
        </div>
      )}

      {/* Bubble + actions */}
      <div className={`flex flex-col min-w-0 ${isUser ? 'items-end max-w-[82%] md:max-w-[75%]' : 'items-start max-w-[90%] md:max-w-[80%]'}`}>

        {/* Bubble */}
        <div className={`w-full rounded-2xl px-3 py-2.5 md:px-5 md:py-3.5 shadow-md ${isUser
            ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
            : 'bg-white/90 dark:bg-gray-800/90 border border-violet-100 dark:border-gray-700 text-gray-900 dark:text-white backdrop-blur-sm'
          }`}>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 md:mb-3 space-y-2">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className={`flex items-center gap-2 p-2 rounded-xl ${isUser ? 'bg-white/20' : 'bg-violet-50 dark:bg-violet-900/20'
                    }`}
                >
                  {attachment.type === 'image' ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-9 h-9 md:w-11 md:h-11 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className={`w-9 h-9 md:w-11 md:h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-white/30' : 'bg-violet-100 dark:bg-violet-800'
                      }`}>
                      <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{attachment.name}</p>
                    <p className="text-[10px] opacity-70">{(attachment.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Text content */}
          <div className="min-w-0 w-full">
            {message.isStreaming ? (
              // Plain text during streaming — cheap render
              <span className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">{message.content}</span>
            ) : (
              // Full markdown once complete
              <MarkdownRenderer content={message.content} />
            )}
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-3.5 md:h-4 bg-current ml-0.5 rounded-sm align-middle animate-pulse" />
            )}
          </div>
        </div>

        {/* Message actions — only for bot, after streaming */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-0.5 md:gap-1 mt-1.5 md:mt-2">
            <motion.button
              whileHover={shouldAnimate ? { scale: 1.1 } : {}}
              whileTap={shouldAnimate ? { scale: 0.9 } : {}}
              onClick={copyToClipboard}
              className="p-1.5 md:p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all duration-150 touch-manipulation"
              title="Copy"
            >
              <Copy className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </motion.button>

            <motion.button
              whileHover={shouldAnimate ? { scale: 1.1 } : {}}
              whileTap={shouldAnimate ? { scale: 0.9 } : {}}
              className="p-1.5 md:p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all duration-150 touch-manipulation"
              title="Regenerate"
            >
              <RotateCcw className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </motion.button>

            <motion.button
              whileHover={shouldAnimate ? { scale: 1.1 } : {}}
              whileTap={shouldAnimate ? { scale: 0.9 } : {}}
              className="p-1.5 md:p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-150 touch-manipulation"
              title="Good"
            >
              <ThumbsUp className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </motion.button>

            <motion.button
              whileHover={shouldAnimate ? { scale: 1.1 } : {}}
              whileTap={shouldAnimate ? { scale: 0.9 } : {}}
              className="p-1.5 md:p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-150 touch-manipulation"
              title="Bad"
            >
              <ThumbsDown className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </motion.button>

            {copied && (
              <span className="text-[10px] md:text-xs text-green-500 font-medium px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 rounded-full ml-1">
                Copied!
              </span>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-1 opacity-60 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 md:w-9 md:h-9 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center shadow-md mt-0.5">
          <User className="w-3.5 h-3.5 md:w-5 md:h-5 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </div>
  );
}

// Only re-render when content or streaming state changes (not every store update)
export const MessageBubble = memo(MessageBubbleInner, (prev, next) => {
  return (
    prev.message.content === next.message.content &&
    prev.message.isStreaming === next.message.isStreaming &&
    prev.isSessionSwitching === next.isSessionSwitching
  );
});