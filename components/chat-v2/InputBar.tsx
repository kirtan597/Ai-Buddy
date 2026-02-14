"use client";

import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { useChatStore } from '@/lib/chat-v2/chatStore';
import { Send, Paperclip, X, Loader2, Image, FileText, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';

interface InputBarProps {
  onShowLogin?: () => void;
}

export function InputBar({ onShowLogin }: InputBarProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: session, status } = useSession();
  const {
    addMessage,
    isStreaming,
    guestMessageCount,
    incrementGuestMessageCount,
    resetGuestMessageCount,
    currentSession
  } = useChatStore();

  // Reset guest count when logged in
  useEffect(() => {
    if (session?.user) {
      resetGuestMessageCount();
    }
  }, [session, resetGuestMessageCount]);

  // ... (existing mobile check useEffect)

  const handleSubmit = async () => {
    if (!input.trim() && attachments.length === 0) return;
    if (isStreaming) return;

    // Check if session is loading to prevent premature guest blocking
    if (status === 'loading') return;

    // Safety: If logged in, ensure guest count is reset
    if (status === 'authenticated' && guestMessageCount > 0) {
      resetGuestMessageCount();
    }

    // Guest limitation check - STRICTLY only if not logged in
    if (status === 'unauthenticated' && guestMessageCount >= 1) {
      onShowLogin?.();
      return;
    }

    const messageContent = input.trim();
    const messageAttachments = [...attachments];

    // Ensure session exists
    if (!currentSession) {
      useChatStore.getState().createSession();
    }

    // Clear input immediately
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Increment guest count if not logged in
    if (status === 'unauthenticated') {
      incrementGuestMessageCount();
    }

    // Add user message
    addMessage({
      role: 'user',
      content: messageContent,
      attachments: messageAttachments.map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        url: URL.createObjectURL(file),
        size: file.size,
        mimeType: file.type,
      })),
    });

    // Send to API
    try {
      const formData = new FormData();
      formData.append('message', messageContent);
      formData.append('conversationId', currentSession?.id || '');
      messageAttachments.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/chat-v2', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to send message');

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      // Add assistant message placeholder
      addMessage({
        role: 'assistant',
        content: '',
        isStreaming: true,
      });

      // Get the message ID from the store
      const currentMessages = useChatStore.getState().currentSession?.messages || [];
      const assistantMessageId = currentMessages[currentMessages.length - 1]?.id || '';

      // Stream response
      let accumulatedContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;

            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                accumulatedContent += data.content;
                // Update the streaming message with throttling for smooth scrolling
                const { updateMessage } = useChatStore.getState();
                updateMessage(assistantMessageId, {
                  content: accumulatedContent,
                  isStreaming: true,
                });

                // Small delay to allow smooth scrolling
                await new Promise(resolve => setTimeout(resolve, 10));
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // Ignore parsing errors for non-JSON lines
            }
          }
        }
      }

      // Mark streaming as complete
      const { updateMessage } = useChatStore.getState();
      updateMessage(assistantMessageId, {
        isStreaming: false,
      });

    } catch (error) {
      console.error('Chat error:', error);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize textarea with mobile-friendly limits
    const textarea = e.target;
    textarea.style.height = 'auto';
    const maxHeight = isMobile ? 80 : 120; // Smaller on mobile
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const quickActions = [
    { icon: Image, label: 'Image', accept: 'image/*' },
    { icon: FileText, label: 'Document', accept: '.pdf,.doc,.docx,.txt' },
  ];

  return (
    <div className="p-3 md:p-6">
      {/* Attachments Preview - Mobile Optimized */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 md:mb-4"
          >
            <div className="flex flex-wrap gap-2 md:gap-3">
              {attachments.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 md:gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-violet-200 dark:border-gray-700 rounded-xl px-3 py-2 md:px-4 md:py-3 shadow-lg"
                >
                  {file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-6 h-6 md:w-8 md:h-8 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                      <FileText className="w-3 h-3 md:w-4 md:h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeAttachment(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors touch-manipulation"
                  >
                    <X className="w-3 h-3 md:w-4 md:h-4" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Container - Mobile Optimized */}
      <div className="relative">
        <div className="flex items-end gap-2 md:gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-violet-200 dark:border-gray-700 rounded-2xl p-3 md:p-4 shadow-lg">
          {/* Text Input - Mobile Optimized */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isMobile ? "Type a message..." : "Type your message... (Shift+Enter for new line)"}
              className="w-full resize-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm md:text-base leading-relaxed"
              rows={1}
              style={{
                minHeight: '20px',
                maxHeight: isMobile ? '80px' : '120px',
                fontSize: isMobile ? '16px' : '14px' // Prevent zoom on iOS
              }}
            />
          </div>

          {/* Quick Actions - Mobile Optimized */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Hide some actions on very small screens */}
            {(!isMobile || window.innerWidth > 360) && quickActions.map((action, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = action.accept;
                    fileInputRef.current.click();
                  }
                }}
                disabled={isStreaming}
                className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                title={`Upload ${action.label}`}
              >
                <action.icon className="w-4 h-4 md:w-5 md:h-5" />
              </motion.button>
            ))}

            {/* Emoji Button - Hidden on very small screens */}
            {(!isMobile || window.innerWidth > 320) && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={isStreaming}
                className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                title="Add emoji"
              >
                <Smile className="w-4 h-4 md:w-5 md:h-5" />
              </motion.button>
            )}

            {/* Send Button - Always Visible */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={(!input.trim() && attachments.length === 0) || isStreaming}
              className="p-2 md:p-3 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-xl hover:from-violet-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation"
              title="Send message"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Character Count - Hidden on mobile to save space */}
        {input.length > 0 && !isMobile && (
          <div className="absolute -bottom-6 right-0 text-xs text-gray-400">
            {input.length} characters
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}