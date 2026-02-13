"use client";

import { useEffect, useState } from 'react';
import { useChatStore } from '@/lib/chat-v2/chatStore';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { ChatSidebar } from './ChatSidebar';
import { ThemeProvider } from './ThemeProvider';
import { Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { LoginModal } from '../LoginModal';

function ChatInterfaceContent() {
  const { currentSession, createSession, setSessions, fetchMessages } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { data: session } = useSession();

  // Fetch messages if current session is empty (e.g. on new device load)
  useEffect(() => {
    if (session?.user && currentSession?.id && currentSession.messages.length === 0) {
      fetchMessages(currentSession.id);
    }
  }, [session, currentSession?.id, currentSession?.messages.length, fetchMessages]);

  // Fetch sessions on login
  useEffect(() => {
    if (session?.user) {
      fetch('/api/conversations/list')
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch sessions');
        })
        .then((data) => {
          // Map backend _id to frontend id if necessary, or ensure types match
          // Assuming backend returns array of objects with id/title/etc.
          // MongoDB returns _id. Frontend expects id. 
          // I should map it here or in the store. 
          // Ideally the API should return 'id'.
          // I'll handle mapping in the transform if needed, but for now passing data.
          // Actually, let's map it safely.
          const formattedSessions = data.map((s: any) => ({
            ...s,
            id: s._id || s.id,
            messages: [], // Message list is fetched on demand usually? 
            // Wait, the store expects full objects?
            // Sidebar expects messages.length.
            // My API 'list' route sends conversation objects.
            // It does NOT send messages.
            // So I need to handle that.
            // The store 'sessions' usually expects full sessions.
            // If I set sessions with empty messages, sidebar count will be 0.
            // That's acceptable for "History" view where we just load on click.
          }));
          setSessions(formattedSessions);
        })
        .catch((err) => console.error(err));
    }
  }, [session, setSessions]);

  // Detect mobile devices and screen size
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!currentSession && !session) {
      // Create local session for guest
      createSession();
    }
  }, [currentSession, createSession, session]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (sidebarOpen && isMobile) {
        const sidebar = document.getElementById('chat-sidebar');
        if (sidebar && !sidebar.contains(e.target as Node)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    return () => document.removeEventListener('touchstart', handleTouchStart);
  }, [sidebarOpen, isMobile]);

  return (
    <div className="h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20 flex relative overflow-hidden">

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-80 border-r border-violet-200 dark:border-gray-700 flex-shrink-0">
        <ChatSidebar />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            id="chat-sidebar"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-80 max-w-[85vw] border-r border-violet-200 dark:border-gray-700 fixed z-50 h-full md:hidden bg-white dark:bg-gray-900"
          >
            <ChatSidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header - Optimized for Mobile */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-violet-200 dark:border-gray-700 px-3 py-3 md:px-4 md:py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              {/* Mobile Menu Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors touch-manipulation"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-5 h-5" />
              </motion.button>

              <div className="min-w-0 flex-1">
                <h1 className="text-lg md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent truncate">
                  AI Buddy
                </h1>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs md:text-sm text-green-600 dark:text-green-400 font-medium hidden sm:inline">
                Online
              </span>
            </div>
          </div>
        </div>

        {/* Messages - Optimized Container */}
        <div className="flex-1 min-h-0 relative">
          <MessageList />
        </div>

        {/* Input - Mobile Optimized */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-violet-200 dark:border-gray-700 flex-shrink-0">
          <InputBar onShowLogin={() => setShowLoginModal(true)} />
        </div>
      </div>
    </div>
  );
}

export function ChatInterface() {
  return (
    <ThemeProvider>
      <ChatInterfaceContent />
    </ThemeProvider>
  );
}