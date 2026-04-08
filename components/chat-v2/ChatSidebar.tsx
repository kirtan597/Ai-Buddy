"use client";

import { useState } from 'react';
import { useChatStore } from '@/lib/chat-v2/chatStore';
import { useTheme } from './ThemeProvider';
import { SessionMenu } from './SessionMenu';
import { SettingsModal } from './SettingsModal';
import {
  Plus, MessageSquare, Settings, Search, X,
  User, LogOut, LogIn, ChevronUp, Sun, Moon, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';

interface ChatSidebarProps {
  onShowLogin: () => void;
  onClose?: () => void;
}

export function ChatSidebar({ onShowLogin, onClose }: ChatSidebarProps) {
  const { sessions, currentSession, createSession, switchToSession, setSessions, fetchMessages } = useChatStore();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const { data: session } = useSession();

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
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
        const newSession = {
          id: data._id || data.id,
          title: data.title,
          messages: [],
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          settings: { model: 'openai/gpt-4o-mini', temperature: 0.7, maxTokens: 4096 },
        };
        const latest = useChatStore.getState().sessions;
        setSessions([newSession, ...latest.filter(s => s.id !== newSession.id)]);
        switchToSession(newSession.id);
        onClose?.();
      } catch (err) {
        console.error('[ChatSidebar] Error creating new chat:', err);
      }
    } else {
      if (sessions.length > 0) {
        onShowLogin();
        return;
      }
      createSession();
      onClose?.();
    }
  };

  const userInitials = (session?.user?.name || session?.user?.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="h-full bg-white/70 dark:bg-[#0d0f1a]/80 backdrop-blur-xl flex flex-col">

      {/* Header */}
      <div className="p-4 border-b border-white/20 dark:border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">AI Buddy</h2>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Problem solver</p>
            </div>
          </div>
          {/* Mobile close button */}
          {onClose && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="md:hidden w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* New Chat button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-xl hover:from-violet-600 hover:to-indigo-600 transition-all duration-200 shadow-md shadow-violet-500/20 text-sm font-medium touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </motion.button>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400/50 transition-all"
            style={{ fontSize: '16px' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-200/50 dark:scrollbar-thumb-white/10">
        <div className="p-2 space-y-1">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-10">
              {searchQuery ? (
                <>
                  <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-xs">No results for "{searchQuery}"</p>
                </>
              ) : (
                <>
                  <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-xs">No conversations yet</p>
                  <p className="text-gray-400 dark:text-gray-600 text-[11px] mt-1">Start a new chat above</p>
                </>
              )}
            </div>
          ) : (
            filteredSessions.map(s => {
              const isActive = currentSession?.id === s.id;
              return (
                <motion.div
                  key={s.id}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    switchToSession(s.id);
                    fetchMessages(s.id);
                    onClose?.();
                  }}
                  className={`group flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all duration-150 touch-manipulation ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-200/50 dark:border-violet-500/20'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${
                    isActive ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600 group-hover:bg-violet-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${
                      isActive ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300'
                    }`}>{s.title}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">
                      {new Date(s.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <SessionMenu sessionId={s.id} sessionTitle={s.title} />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onShowLogin={onShowLogin} />

      {/* Bottom toolbar */}
      <div className="border-t border-white/20 dark:border-white/5 p-2 space-y-1">

        {/* Theme toggle */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs touch-manipulation"
        >
          {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </motion.button>

        {/* Settings */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs touch-manipulation"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </motion.button>

        {/* Account */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => session?.user ? setShowAccount(v => !v) : onShowLogin()}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors touch-manipulation"
        >
          {session?.user ? (
            session.user.image ? (
              <img src={session.user.image} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover ring-2 ring-violet-300/60 dark:ring-violet-600/40 flex-shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {userInitials}
              </div>
            )
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 text-gray-500" />
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
              {session?.user ? (session.user.name?.split(' ')[0] || 'Account') : 'Guest'}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
              {session?.user ? session.user.email : 'Sign in to save chats'}
            </p>
          </div>
          {session?.user ? (
            <motion.span animate={{ rotate: showAccount ? 0 : 180 }} transition={{ duration: 0.18 }}>
              <ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" />
            </motion.span>
          ) : (
            <LogIn className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
          )}
        </motion.button>

        {/* Account expand */}
        <AnimatePresence>
          {showAccount && session?.user && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-1 rounded-xl bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 overflow-hidden">
                <button
                  onClick={() => signOut({ callbackUrl: window.location.origin })}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group touch-manipulation"
                >
                  <LogOut className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 transition-colors" />
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
  );
}
