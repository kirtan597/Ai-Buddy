"use client";

import { useState } from 'react';
import { useChatStore } from '@/lib/chat-v2/chatStore';
import { useTheme } from './ThemeProvider';
import { SessionMenu } from './SessionMenu';
import { useLenisScroll } from '@/hooks/useLenisScroll';
import { Plus, MessageSquare, Sun, Moon, Settings, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

export function ChatSidebar() {
  const { sessions, currentSession, createSession, switchToSession } = useChatStore();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  
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
          onClick={createSession}
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
                  onClick={() => switchToSession(session.id)}
                  className={`group p-2 md:p-3 rounded-lg cursor-pointer transition-all duration-200 touch-manipulation ${
                    currentSession?.id === session.id
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

      <div className="p-2 md:p-4 border-t border-violet-200 dark:border-gray-700 space-y-1 md:space-y-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 md:gap-3 px-2 py-2 md:px-3 md:py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-xs md:text-sm touch-manipulation"
        >
          {theme === 'light' ? <Moon className="w-3 h-3 md:w-4 md:h-4" /> : <Sun className="w-3 h-3 md:w-4 md:h-4" />}
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-2 md:gap-3 px-2 py-2 md:px-3 md:py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-xs md:text-sm touch-manipulation"
        >
          <Settings className="w-3 h-3 md:w-4 md:h-4" />
          <span>Settings</span>
        </motion.button>
      </div>
    </div>
  );
}