"use client";

import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { useChatStore } from '@/lib/chat-v2/chatStore';
import { Send, X, Loader2, Image as ImageIcon, Camera, FolderOpen, Plus, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';

interface InputBarProps {
  onShowLogin?: () => void;
}

export function InputBar({ onShowLogin }: InputBarProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
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

  // Pull fast streaming updater directly (not from hook to avoid re-subscribing)
  const updateStreamingMessage = useChatStore(s => s.updateStreamingMessage);

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

      // --- Optimised streaming loop ---
      // We accumulate content in a local variable and only push to the store
      // once per animation frame, preventing one state-update per tiny chunk.
      let accumulatedContent = '';
      let rafPending = false;

      const flushToStore = () => {
        updateStreamingMessage(assistantMessageId, accumulatedContent);
        rafPending = false;
      };

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;

            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                accumulatedContent += data.content;
                // Batch: only schedule one rAF per frame, not one per chunk
                if (!rafPending) {
                  rafPending = true;
                  requestAnimationFrame(flushToStore);
                }
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // Ignore JSON parse errors for non-data lines
            }
          }
        }
      }

      // Flush any remaining content that didn't get a frame yet
      if (accumulatedContent) {
        updateStreamingMessage(assistantMessageId, accumulatedContent);
      }

      // Mark streaming as complete — this triggers sessions[] sync once at the end
      const { updateMessage } = useChatStore.getState();
      updateMessage(assistantMessageId, { isStreaming: false });

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
    <div
      className="px-2 py-2 md:px-4 md:py-3"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {/* Attachments Preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2"
          >
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 max-w-[160px] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-violet-200 dark:border-gray-700 rounded-xl px-2 py-1.5 shadow-md"
                >
                  {file.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(file)} alt={file.name} className="w-5 h-5 object-cover rounded flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 bg-violet-100 dark:bg-violet-900/30 rounded flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeAttachment(index)} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors touch-manipulation flex-shrink-0">
                    <X className="w-3 h-3" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main input row: [+]  [textarea]  [Send] ── */}
      <div className="relative flex items-end gap-2">

        {/* ── Plus button (left side) with popup menu ── */}
        <div className="relative flex-shrink-0 self-end mb-0.5">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowAttachMenu(v => !v)}
            disabled={isStreaming}
            className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-violet-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-400 dark:hover:border-violet-500 shadow-sm transition-all duration-200 disabled:opacity-40 touch-manipulation"
            title="Add attachment"
          >
            <motion.span
              animate={{ rotate: showAttachMenu ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="w-4 h-4" />
            </motion.span>
          </motion.button>

          {/* Popup menu — fixed so it never gets clipped by parent containers */}
          <AnimatePresence>
            {showAttachMenu && (
              <>
                {/* Click-outside dismisser */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAttachMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  // Position fixed, anchored near the bottom-left of the viewport
                  // Add bottom offset accounting for the input bar height (~60px) + safe area
                  className="fixed left-3 md:left-4 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden w-40"
                  style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
                >
                  {/* Photo */}
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*';
                        fileInputRef.current.click();
                      }
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors touch-manipulation group"
                  >
                    <ImageIcon className="w-4 h-4 text-violet-500 group-hover:text-violet-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-violet-600 dark:group-hover:text-violet-400">Photo</span>
                  </button>

                  {/* Camera */}
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*';
                        fileInputRef.current.capture = 'environment';
                        fileInputRef.current.click();
                      }
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors touch-manipulation group border-t border-gray-100 dark:border-gray-800"
                  >
                    <Camera className="w-4 h-4 text-sky-500 group-hover:text-sky-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">Camera</span>
                  </button>

                  {/* Files */}
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = '.pdf,.doc,.docx,.txt,.csv,.xlsx';
                        fileInputRef.current.removeAttribute('capture');
                        fileInputRef.current.click();
                      }
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors touch-manipulation group border-t border-gray-100 dark:border-gray-800"
                  >
                    <FolderOpen className="w-4 h-4 text-indigo-500 group-hover:text-indigo-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Files</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* ── Text input ── */}
        <div className="flex-1 flex items-end bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-violet-200 dark:border-gray-700 rounded-2xl px-3 py-2.5 md:px-4 md:py-3 shadow-lg">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isMobile ? 'Type a message...' : 'Type your message... (Shift+Enter for new line)'}
            className="flex-1 resize-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm md:text-base leading-relaxed"
            rows={1}
            style={{
              minHeight: '22px',
              maxHeight: isMobile ? '80px' : '120px',
              fontSize: isMobile ? '16px' : '14px',
            }}
          />

          {/* Send button — inside the text box on the right */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={(!input.trim() && attachments.length === 0) || isStreaming}
            className="flex-shrink-0 ml-2 p-1.5 md:p-2 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-xl hover:from-violet-600 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md touch-manipulation self-end"
            title="Send message"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </div>
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