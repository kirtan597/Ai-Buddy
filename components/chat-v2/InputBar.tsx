"use client";

import { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react';
import { useChatStore } from '@/lib/chat-v2/chatStore';
import {
  Send, X, Loader2, Image as ImageIcon, Camera,
  FolderOpen, Plus, FileText, Square, Sparkles, Code2, BookOpen, Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';

interface InputBarProps {
  onShowLogin?: () => void;
}

// Quick-action prompt chips shown above the input when it's empty
const QUICK_PROMPTS = [
  { icon: Code2,     label: 'Debug code',     prompt: 'Help me debug this code:' },
  { icon: Lightbulb, label: 'Explain concept', prompt: 'Explain this concept simply:' },
  { icon: Sparkles,  label: 'Brainstorm',      prompt: 'Brainstorm ideas for:' },
  { icon: BookOpen,  label: 'Summarise',       prompt: 'Summarise this for me:' },
];

export function InputBar({ onShowLogin }: InputBarProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  // Store object URLs separately so we can revoke them on cleanup
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: session, status } = useSession();

  const addMessage              = useChatStore(s => s.addMessage);
  const setStreaming             = useChatStore(s => s.setStreaming);
  const isStreaming              = useChatStore(s => s.isStreaming);
  const guestMessageCount       = useChatStore(s => s.guestMessageCount);
  const incrementGuestMessageCount = useChatStore(s => s.incrementGuestMessageCount);
  const resetGuestMessageCount  = useChatStore(s => s.resetGuestMessageCount);
  const currentSessionId        = useChatStore(s => s.currentSession?.id);
  const updateStreamingMessage  = useChatStore(s => s.updateStreamingMessage);
  const updateMessage           = useChatStore(s => s.updateMessage);

  // ── Reset guest count on login ───────────────────────────────────────────────
  useEffect(() => {
    if (session?.user) resetGuestMessageCount();
  }, [session, resetGuestMessageCount]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Revoke object URLs on unmount (fixes memory leak) ───────────────────────
  useEffect(() => {
    return () => {
      attachmentPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [attachmentPreviews]);

  // ── Auto-resize textarea ─────────────────────────────────────────────────────
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxH = isMobile ? 96 : 140;
    el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
  }, [isMobile]);

  // ── Stop streaming ───────────────────────────────────────────────────────────
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreaming(false);
    // Mark the current streaming message as done
    const msgs = useChatStore.getState().currentSession?.messages || [];
    const streamingMsg = msgs.findLast(m => m.isStreaming);
    if (streamingMsg) updateMessage(streamingMsg.id, { isStreaming: false });
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    if (status === 'loading') return;

    if (status === 'authenticated' && guestMessageCount > 0) resetGuestMessageCount();

    if (status === 'unauthenticated' && guestMessageCount >= 1) {
      onShowLogin?.();
      return;
    }

    const messageContent = input.trim();
    const messageAttachments = [...attachments];
    const previewUrls = [...attachmentPreviews];

    // Clear input immediately for responsiveness
    setInput('');
    setAttachments([]);
    setAttachmentPreviews([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    if (status === 'unauthenticated') incrementGuestMessageCount();

    // Ensure session exists
    if (!currentSessionId) {
      useChatStore.getState().createSession();
    }

    addMessage({
      role: 'user',
      content: messageContent,
      attachments: messageAttachments.map((file, i) => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        url: previewUrls[i] || '',
        size: file.size,
        mimeType: file.type,
      })),
    });

    // Cancel any previous in-flight request
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setStreaming(true);
    try {
      const formData = new FormData();
      formData.append('message', messageContent);
      const sessionId = useChatStore.getState().currentSession?.id || '';
      formData.append('conversationId', sessionId);
      messageAttachments.forEach(f => formData.append('files', f));

      const response = await fetch('/api/chat-v2', {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errData.error || 'Request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      addMessage({ role: 'assistant', content: '', isStreaming: true });

      const currentMsgs = useChatStore.getState().currentSession?.messages || [];
      const assistantMsgId = currentMsgs[currentMsgs.length - 1]?.id || '';

      let accumulated = '';
      let rafPending = false;
      const decoder = new TextDecoder();

      const flush = () => {
        updateStreamingMessage(assistantMsgId, accumulated);
        rafPending = false;
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6);
            if (raw === '[DONE]') break;
            // Ignore SSE comment lines (heartbeats)
            if (raw.startsWith(':')) continue;

            try {
              const data = JSON.parse(raw);
              if (data.content) {
                accumulated += data.content;
                if (!rafPending) {
                  rafPending = true;
                  requestAnimationFrame(flush);
                }
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) throw e;
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Final flush
      if (accumulated) updateStreamingMessage(assistantMsgId, accumulated);
      updateMessage(assistantMsgId, { isStreaming: false });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('[InputBar] Chat error:', error);
      addMessage({
        role: 'assistant',
        content: `> ❌ **Error**: ${(error as Error).message || 'Something went wrong. Please try again.'}`,
      });
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) return;
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    resizeTextarea();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const urls = files.map(f => URL.createObjectURL(f));
    setAttachments(prev => [...prev, ...files]);
    setAttachmentPreviews(prev => [...prev, ...urls]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    URL.revokeObjectURL(attachmentPreviews[index]);
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setAttachmentPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const isEmpty = !input.trim() && attachments.length === 0;

  return (
    <div
      className="px-3 pt-2 md:px-4 md:pt-3"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 0.5rem, 0.75rem)' }}
    >
      {/* Quick-action chips (shown when input is empty and not streaming) */}
      <AnimatePresence>
        {isEmpty && !isStreaming && !isFocused && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="mb-2 flex flex-wrap gap-1.5"
          >
            {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
              <motion.button
                key={label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setInput(prompt + ' ');
                  textareaRef.current?.focus();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium bg-white/80 dark:bg-white/5 border border-white/50 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-violet-300 dark:hover:border-violet-500/50 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-150 shadow-sm backdrop-blur-sm touch-manipulation"
              >
                <Icon className="w-3 h-3 flex-shrink-0" />
                {label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment previews */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2"
          >
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((file, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 max-w-[180px] bg-white/90 dark:bg-white/5 border border-white/50 dark:border-white/10 rounded-xl px-2 py-1.5 shadow-sm backdrop-blur-sm"
                >
                  {file.type.startsWith('image/') ? (
                    <img src={attachmentPreviews[i]} alt={file.name} className="w-5 h-5 object-cover rounded flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 bg-violet-100 dark:bg-violet-900/30 rounded flex items-center justify-center flex-shrink-0">
                      <FileText className="w-2.5 h-2.5 text-violet-500" />
                    </div>
                  )}
                  <p className="text-[11px] text-gray-700 dark:text-gray-300 truncate flex-1">{file.name}</p>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeAttachment(i)} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-2.5 h-2.5" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main input row ──────────────────────────────────────────────────── */}
      <div className="flex items-end gap-2">

        {/* Attach button */}
        <div className="relative flex-shrink-0 self-end mb-0.5">
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowAttachMenu(v => !v)}
            disabled={isStreaming}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 dark:bg-white/5 border border-white/50 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-500/50 transition-all shadow-sm backdrop-blur-sm disabled:opacity-40 touch-manipulation"
          >
            <motion.span animate={{ rotate: showAttachMenu ? 45 : 0 }} transition={{ duration: 0.2 }}>
              <Plus className="w-4 h-4" />
            </motion.span>
          </motion.button>

          {/* Attachment menu */}
          <AnimatePresence>
            {showAttachMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="fixed left-3 md:left-4 z-50 w-44 rounded-2xl overflow-hidden shadow-2xl bg-white/95 dark:bg-gray-900/95 border border-white/50 dark:border-white/10 backdrop-blur-xl"
                  style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
                >
                  {[
                    { icon: ImageIcon, label: 'Photo', color: 'violet', accept: 'image/*', capture: undefined },
                    { icon: Camera,    label: 'Camera', color: 'sky',    accept: 'image/*', capture: 'environment' as const },
                    { icon: FolderOpen, label: 'Files', color: 'indigo', accept: '.pdf,.doc,.docx,.txt,.csv,.xlsx,.md', capture: undefined },
                  ].map(({ icon: Icon, label, color, accept, capture }) => (
                    <button
                      key={label}
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = accept;
                          if (capture) fileInputRef.current.capture = capture;
                          else fileInputRef.current.removeAttribute('capture');
                          fileInputRef.current.click();
                        }
                        setShowAttachMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-${color}-50 dark:hover:bg-${color}-900/20 transition-colors group border-t first:border-t-0 border-gray-100 dark:border-white/5 touch-manipulation`}
                    >
                      <Icon className={`w-4 h-4 text-${color}-500 flex-shrink-0`} />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Text area wrapper */}
        <motion.div
          animate={{
            boxShadow: isFocused
              ? '0 0 0 2px rgba(139,92,246,0.25), 0 4px 24px rgba(139,92,246,0.12)'
              : '0 2px 12px rgba(0,0,0,0.04)',
          }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex items-end gap-2 bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-2xl px-3.5 py-2.5 backdrop-blur-xl transition-colors duration-200"
          style={{ borderColor: isFocused ? 'rgba(139,92,246,0.4)' : undefined }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isStreaming ? 'AI is thinking…' : (isMobile ? 'Ask anything…' : 'Ask anything… (Shift+Enter for new line)')}
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none leading-relaxed caret-violet-500 disabled:opacity-60"
            style={{
              fontSize: '16px', // Prevents iOS zoom
              minHeight: '24px',
              maxHeight: isMobile ? '96px' : '140px',
              WebkitTextSizeAdjust: '100%',
            }}
          />

          {/* Send / Stop button */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.93 }}
            onClick={isStreaming ? handleStop : handleSubmit}
            disabled={!isStreaming && isEmpty}
            className="flex-shrink-0 self-end w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: isStreaming
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              boxShadow: (isStreaming || !isEmpty)
                ? '0 4px 14px rgba(124,58,237,0.35)'
                : 'none',
            }}
            title={isStreaming ? 'Stop generating' : 'Send message'}
          >
            {isStreaming ? (
              <Square className="w-3.5 h-3.5 text-white fill-white" />
            ) : (
              <Send className="w-3.5 h-3.5 text-white" />
            )}
          </motion.button>
        </motion.div>
      </div>

      {/* Hint text */}
      {!isMobile && !isStreaming && (
        <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      )}

      <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
    </div>
  );
}
