"use client";

import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@/lib/chat-v2/chatStore';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { ChatSidebar } from './ChatSidebar';
import { ThemeProvider } from './ThemeProvider';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { LoginModal } from '../LoginModal';

function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0d0f1a] to-slate-950 dark:opacity-100 opacity-0 transition-opacity duration-500" />
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-slate-50 to-indigo-50 dark:opacity-0 opacity-100 transition-opacity duration-500" />

      {/* Aurora orbs — dark mode */}
      <div className="hidden dark:block">
        <div
          className="absolute rounded-full blur-3xl opacity-20 animate-aurora-1"
          style={{ width: 600, height: 600, top: '-10%', left: '-5%', background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-15 animate-aurora-2"
          style={{ width: 500, height: 500, top: '30%', right: '-10%', background: 'radial-gradient(circle, #4f46e5, transparent 70%)' }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-10 animate-aurora-3"
          style={{ width: 400, height: 400, bottom: '-5%', left: '25%', background: 'radial-gradient(circle, #0ea5e9, transparent 70%)' }}
        />
      </div>

      {/* Subtle orbs — light mode */}
      <div className="block dark:hidden">
        <div
          className="absolute rounded-full blur-3xl opacity-30"
          style={{ width: 700, height: 700, top: '-20%', right: '-10%', background: 'radial-gradient(circle, #ede9fe, transparent 70%)' }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-20"
          style={{ width: 500, height: 500, bottom: '0%', left: '-5%', background: 'radial-gradient(circle, #e0e7ff, transparent 70%)' }}
        />
      </div>

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '200px' }}
      />
    </div>
  );
}

function ChatInterfaceContent() {
  const { currentSession, createSession, setSessions, fetchMessages } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { data: session, status } = useSession();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Load messages when switching to a session with no cached messages
  useEffect(() => {
    if (session?.user && currentSession?.id && currentSession.messages.length === 0) {
      fetchMessages(currentSession.id);
    }
  }, [session, currentSession?.id, currentSession?.messages.length, fetchMessages]);

  // Load conversation list on login
  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/conversations/list')
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then((data: Record<string, unknown>[]) => {
        setSessions(
          data.map(s => ({
            ...(s as object),
            id: (s._id || s.id) as string,
            messages: [],
          } as Parameters<typeof setSessions>[0][number]))
        );
      })
      .catch(err => console.error('[ChatInterface] Failed to load sessions:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Create guest session
  useEffect(() => {
    if (status === 'loading' || status === 'authenticated') return;
    if (!currentSession) createSession();
  }, [currentSession, createSession, status]);

  // Close sidebar on outside tap (mobile)
  useEffect(() => {
    const handle = (e: TouchEvent) => {
      if (sidebarOpen && isMobile && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('touchstart', handle);
    return () => document.removeEventListener('touchstart', handle);
  }, [sidebarOpen, isMobile]);

  return (
    <>
      <AuroraBackground />

      <div
        className="h-[100dvh] flex relative overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Desktop sidebar */}
        <div className="hidden md:block w-72 lg:w-80 flex-shrink-0 border-r border-white/10 dark:border-white/5">
          <ChatSidebar onShowLogin={() => setShowLoginModal(true)} />
        </div>

        {/* Mobile sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              ref={sidebarRef}
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] z-50 md:hidden border-r border-white/10 dark:border-white/5"
            >
              <ChatSidebar onShowLogin={() => setShowLoginModal(true)} onClose={() => setSidebarOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main chat column */}
        <div className="flex-1 flex flex-col min-w-0 relative">

          {/* Topbar */}
          <div className="flex-shrink-0 flex items-center justify-between px-3 md:px-5 py-3 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-b border-white/20 dark:border-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Hamburger (mobile) */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSidebarOpen(v => !v)}
                className="md:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors touch-manipulation"
                aria-label="Toggle sidebar"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {sidebarOpen ? (
                    <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <X className="w-4 h-4" />
                    </motion.span>
                  ) : (
                    <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <Menu className="w-4 h-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Logo */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white truncate leading-tight">
                    AI Buddy
                  </h1>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-none hidden md:block">
                    Problem-solving assistant
                  </p>
                </div>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 relative">
            <MessageList />
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-t border-white/20 dark:border-white/5">
            <InputBar onShowLogin={() => setShowLoginModal(true)} />
          </div>
        </div>
      </div>
    </>
  );
}

export function ChatInterface() {
  return (
    <ThemeProvider>
      <ChatInterfaceContent />
    </ThemeProvider>
  );
}
