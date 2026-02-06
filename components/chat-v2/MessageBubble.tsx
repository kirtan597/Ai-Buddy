"use client";

import { Message } from '@/types/chat-v2';
import { motion } from 'framer-motion';
import { Copy, User, Bot, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState } from 'react';

interface MessageBubbleProps {
  message: Message;
  index?: number;
  isSessionSwitching?: boolean;
}

export function MessageBubble({ message, index = 0, isSessionSwitching = false }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  // For session switching, show immediately without any animations or intersection observers
  const shouldAnimate = !isSessionSwitching;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-2 md:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
          <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </div>
      )}

      <div className={`max-w-[85%] md:max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        {/* Message Content - Mobile Optimized */}
        <div className={`rounded-2xl px-4 py-3 md:px-6 md:py-4 shadow-lg backdrop-blur-sm ${
          isUser
            ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
            : 'bg-white/80 dark:bg-gray-800/80 border border-violet-200 dark:border-gray-700 text-gray-900 dark:text-white'
        }`}>
          {/* Attachments - Mobile Optimized */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3 md:mb-4 space-y-2 md:space-y-3">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl ${
                    isUser ? 'bg-white/20' : 'bg-violet-50 dark:bg-violet-900/20'
                  }`}
                >
                  {attachment.type === 'image' ? (
                    <img 
                      src={attachment.url} 
                      alt={attachment.name}
                      className="w-10 h-10 md:w-12 md:h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${
                      isUser ? 'bg-white/30' : 'bg-violet-100 dark:bg-violet-800'
                    }`}>
                      <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs md:text-sm truncate">{attachment.name}</p>
                    <p className="text-xs opacity-70">{(attachment.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Text Content - Mobile Optimized */}
          <div className="whitespace-pre-wrap break-words leading-relaxed text-sm md:text-base">
            {message.content}
            {message.isStreaming && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block w-2 h-4 md:h-5 bg-current ml-1 rounded-sm"
              />
            )}
          </div>
        </div>

        {/* Message Actions - Mobile Optimized */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-1 md:gap-2 mt-2 md:mt-3 ml-1 md:ml-2">
            <motion.button
              whileHover={shouldAnimate ? { scale: 1.1 } : {}}
              whileTap={shouldAnimate ? { scale: 0.9 } : {}}
              onClick={copyToClipboard}
              className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all duration-200 touch-manipulation"
              title="Copy message"
            >
              <Copy className="w-3 h-3 md:w-4 md:h-4" />
            </motion.button>
            
            <motion.button
              whileHover={shouldAnimate ? { scale: 1.1 } : {}}
              whileTap={shouldAnimate ? { scale: 0.9 } : {}}
              className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all duration-200 touch-manipulation"
              title="Regenerate response"
            >
              <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
            </motion.button>
            
            <motion.button
              whileHover={shouldAnimate ? { scale: 1.1 } : {}}
              whileTap={shouldAnimate ? { scale: 0.9 } : {}}
              className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200 touch-manipulation"
              title="Good response"
            >
              <ThumbsUp className="w-3 h-3 md:w-4 md:h-4" />
            </motion.button>
            
            <motion.button
              whileHover={shouldAnimate ? { scale: 1.1 } : {}}
              whileTap={shouldAnimate ? { scale: 0.9 } : {}}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 touch-manipulation"
              title="Poor response"
            >
              <ThumbsDown className="w-3 h-3 md:w-4 md:h-4" />
            </motion.button>
            
            {copied && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-xs text-green-500 font-medium px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-full ml-2"
              >
                Copied!
              </motion.span>
            )}
          </div>
        )}

        {/* Timestamp - Mobile Optimized */}
        <div className={`text-xs text-gray-500 dark:text-gray-400 mt-1 md:mt-2 opacity-70 ${
          isUser ? 'text-right' : 'text-left ml-1 md:ml-2'
        }`}>
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center shadow-lg">
          <User className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </div>
  );
}