"use client";

import { useChatStore } from '@/lib/chat-v2/chatStore';
import { useTheme } from './ThemeProvider';
import { RotateCcw, Trash2, Square, Sun, Moon } from 'lucide-react';

export function ChatControls() {
  const { 
    clearCurrentSession, 
    regenerateLastMessage, 
    isStreaming, 
    setStreaming,
    currentSession 
  } = useChatStore();
  
  const { theme, toggleTheme } = useTheme();

  const hasMessages = currentSession?.messages && currentSession.messages.length > 0;
  const hasAssistantMessages = currentSession?.messages?.some(m => m.role === 'assistant');

  const handleStop = () => {
    setStreaming(false);
    // In a real implementation, you'd also abort the fetch request
  };

  return (
    <div className="flex items-center gap-2">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>
      {/* Stop Generation */}
      {isStreaming && (
        <button
          onClick={handleStop}
          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Stop generation"
        >
          <Square className="w-4 h-4" />
        </button>
      )}

      {/* Regenerate Last Response */}
      {hasAssistantMessages && !isStreaming && (
        <button
          onClick={regenerateLastMessage}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Regenerate last response"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}

      {/* Clear Chat */}
      {hasMessages && (
        <button
          onClick={clearCurrentSession}
          className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}