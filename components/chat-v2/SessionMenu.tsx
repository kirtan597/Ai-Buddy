"use client";

import { useState } from 'react';
import { useChatStore } from '@/lib/chat-v2/chatStore';
import { exportChatAsText, exportChatAsJSON, downloadChat } from '@/lib/chat-v2/exportUtils';
import { MoreVertical, Edit2, Trash2, Copy, Download, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SessionMenuProps {
  sessionId: string;
  sessionTitle: string;
}

export function SessionMenu({ sessionId, sessionTitle }: SessionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(sessionTitle);
  const { deleteSession, updateSessionTitle } = useChatStore();

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== sessionTitle) {
      updateSessionTitle(sessionId, newTitle.trim());
    }
    setIsRenaming(false);
    setIsOpen(false);
  };

  const handleDelete = () => {
    deleteSession(sessionId);
    setIsOpen(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionTitle);
    setIsOpen(false);
  };

  const handleExportText = () => {
    const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
    if (session) {
      const content = exportChatAsText(session);
      const filename = `${session.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
      downloadChat(content, filename, 'text');
    }
    setIsOpen(false);
  };

  const handleExportJSON = () => {
    const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
    if (session) {
      const content = exportChatAsJSON(session);
      const filename = `${session.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      downloadChat(content, filename, 'json');
    }
    setIsOpen(false);
  };

  if (isRenaming) {
    return (
      <div className="flex-1 min-w-0 mr-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') {
              setNewTitle(sessionTitle);
              setIsRenaming(false);
            }
          }}
          className="w-full bg-transparent border-b border-violet-300 dark:border-violet-600 text-sm font-medium text-gray-900 dark:text-white focus:outline-none"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
      >
        <MoreVertical className="w-3 h-3" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-6 z-20 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Edit2 className="w-3 h-3" />
                Rename
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy Title
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportText();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FileText className="w-3 h-3" />
                Export as Text
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportJSON();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="w-3 h-3" />
                Export as JSON
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}