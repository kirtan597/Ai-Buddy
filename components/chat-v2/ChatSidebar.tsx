"use client";

import { useState } from 'react';
import { useChatStore } from '@/lib/chat-v2/chatStore';
import { useTheme } from './ThemeProvider';
import { SessionMenu } from './SessionMenu';
import { useLenisScroll } from '@/hooks/useLenisScroll';
import { SettingsModal } from './SettingsModal';
import { Plus, MessageSquare, Sun, Moon, Settings, Search, X, User, LogOut, LogIn, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';

interface ChatSidebarProps {
  onShowLogin: () => void;
}

export function ChatSidebar({ onShowLogin }: ChatSidebarProps) {
  const { sessions, currentSession, createSession, switchToSession, setSessions, fetchMessages } = useChatStore();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const { data: session } = useSession();

  // Lenis smooth scrolling for session list
  const { scrollRef } = useLenisScroll({
    duration: 0.8,
    smooth: true,
    autoScroll: false, // Don't auto-scroll in sidebar
  });

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.messages.some(msg =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleNewChat = async () => {
    if (session?.user) {
      try {
        const res = await fetch('/api/conversation/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Chat' }),
        });

        if (!res.ok) throw new Error('Failed to create chat');

        const data = await res.json();

        // Map backend response to frontend session format
        const newSession = {
          id: data._id, // Use _id from MongoDB
          title: data.title,
          messages: [],
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          settings: {
            model: 'openai/gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 2000,
          },
        };

        setSessions([newSession, ...sessions]);
        switchToSession(newSession.id);
      } catch (error) {
        console.error('Error creating new chat:', error);
      }
    } else {
      // Guest logic: Limit to 1 chat
      if (sessions.length > 0) {
        onShowLogin();
        return;
      }
      createSession();
    }
  };

  return (
    <div className="h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex flex-col">
      <div className="p-3 md:p-4 border-b border-violet-200 dark:border-gray-700">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full flex items-center justify-center">
            <MessageSquare className="w-3 h-3 md:w-4 md:h-4 text-white" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Chat History</h2>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 md:px-4 md:py-3 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-xl hover:from-violet-600 hover:to-indigo-600 transition-all duration-200 shadow-lg text-sm md:text-base touch-manipulation"
        >
          <Plus className="w-3 h-3 md:w-4 md:h-4" />
          New Chat
        </motion.button>

        {/* Search - Mobile Optimized */}
        <div className="relative mt-3 md:mt-4">
          <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 md:pl-10 pr-8 md:pr-10 py-2 bg-white/60 dark:bg-gray-800/60 border border-violet-200 dark:border-gray-700 rounded-lg text-xs md:text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            style={{ fontSize: '16px' }} // Prevent zoom on iOS
          />
          {searchQuery && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSearchQuery('')}
              className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-manipulation"
            >
              <X className="w-3 h-3 md:w-4 md:h-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Lenis Smooth Scrolling Session List - Mobile Optimized */}
      <div className="flex-1 min-h-0">
        <div
          ref={scrollRef}
          className="h-full"
          style={{
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div className="p-2 md:p-4 space-y-1 md:space-y-2">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                {searchQuery ? (
                  <>
                    <Search className="w-8 h-8 md:w-12 md:h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2 md:mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">No conversations found</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Try a different search term</p>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-8 h-8 md:w-12 md:h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2 md:mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">No conversations yet</p>
                  </>
                )}
              </div>
            ) : (
              filteredSessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    switchToSession(session.id);
                    fetchMessages(session.id);
                  }}
                  className={`group p-2 md:p-3 rounded-lg cursor-pointer transition-all duration-200 touch-manipulation ${currentSession?.id === session.id
                    ? 'bg-gradient-to-r from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 border border-violet-200 dark:border-violet-700'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white text-xs md:text-sm truncate">
                        {session.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {session.messages.length} messages
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <SessionMenu sessionId={session.id} sessionTitle={session.title} />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onShowLogin={onShowLogin}
      />

      {/* ── Bottom toolbar: Settings + Account ── */}
      <div className="border-t border-violet-200 dark:border-gray-700">

        {/* Settings button */}
        <div className="px-2 pt-2 md:px-4 md:pt-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-2 md:gap-3 px-2 py-2 md:px-3 md:py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-xs md:text-sm touch-manipulation"
          >
            <Settings className="w-3 h-3 md:w-4 md:h-4" />
            <span>Settings</span>
          </motion.button>
        </div>

        {/* Account row — always visible, expands on click */}
        <div className="px-2 pb-2 md:px-4 md:pb-3 pt-1">

          {/* Trigger row */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => session?.user ? setShowAccount(v => !v) : onShowLogin()}
            className="w-full flex items-center gap-2 md:gap-3 px-2 py-2 md:px-3 md:py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation"
          >
            {/* Avatar */}
            {session?.user ? (
              session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover ring-2 ring-violet-300 dark:ring-violet-600 flex-shrink-0"
                />
              ) : (
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {(session.user.name || session.user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              )
            ) : (
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3 text-gray-400" />
              </div>
            )}

            {/* Name / Guest label */}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs md:text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {session?.user ? (session.user.name?.split(' ')[0] || 'Account') : 'Guest'}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                {session?.user ? session.user.email : 'Not signed in'}
              </p>
            </div>

            {/* Arrow */}
            {session?.user && (
              <motion.span
                animate={{ rotate: showAccount ? 0 : 180 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </motion.span>
            )}
            {!session?.user && (
              <LogIn className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
            )}
          </motion.button>

          {/* Expanded account panel */}
          <AnimatePresence>
            {showAccount && session?.user && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="mt-1 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 overflow-hidden">

                  {/* Account info */}
                  <div className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || 'Profile'}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(session.user.name || session.user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{session.user.name || 'User'}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{session.user.email}</p>
                    </div>
                  </div>

                  {/* Sign out */}
                  <button
                    onClick={() => signOut({ callbackUrl: window.location.origin })}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group touch-manipulation"
                  >
                    <LogOut className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 transition-colors flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      Sign Out
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}