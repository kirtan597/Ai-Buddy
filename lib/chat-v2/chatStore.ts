import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ChatState, ChatSession, Message } from '@/types/chat-v2';
import { nanoid } from 'nanoid';

interface ChatActions {
  createSession: () => void;
  switchToSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearCurrentSession: () => void;
  setStreaming: (isStreaming: boolean) => void;
  setUploading: (isUploading: boolean) => void;
  setError: (error: string | null) => void;
  regenerateLastMessage: () => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
}

export const useChatStore = create<ChatState & ChatActions>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        currentSession: null,
        sessions: [],
        isStreaming: false,
        isUploading: false,
        error: null,

        // Actions
        createSession: () => {
          const newSession: ChatSession = {
            id: nanoid(),
            title: 'New Chat',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            settings: {
              model: 'openai/gpt-4o-mini',
              temperature: 0.7,
              maxTokens: 2000,
            },
          };

          set((state) => ({
            currentSession: newSession,
            sessions: [newSession, ...state.sessions],
          }));
        },

        switchToSession: (sessionId) => {
          set((state) => {
            const session = state.sessions.find(s => s.id === sessionId);
            return session ? { currentSession: session } : state;
          });
        },

        deleteSession: (sessionId) => {
          set((state) => {
            const updatedSessions = state.sessions.filter(s => s.id !== sessionId);
            const newCurrentSession = state.currentSession?.id === sessionId 
              ? (updatedSessions[0] || null)
              : state.currentSession;
            
            return {
              sessions: updatedSessions,
              currentSession: newCurrentSession,
            };
          });
        },

        addMessage: (messageData) => {
          const message: Message = {
            ...messageData,
            id: nanoid(),
            timestamp: new Date(),
          };

          set((state) => {
            if (!state.currentSession) return state;

            const updatedSession = {
              ...state.currentSession,
              messages: [...state.currentSession.messages, message],
              updatedAt: new Date(),
              title: state.currentSession.messages.length === 0 && message.role === 'user'
                ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                : state.currentSession.title,
            };

            return {
              currentSession: updatedSession,
              sessions: state.sessions.map(s => 
                s.id === updatedSession.id ? updatedSession : s
              ),
            };
          });
        },

        updateMessage: (id, updates) => {
          set((state) => {
            if (!state.currentSession) return state;

            const updatedSession = {
              ...state.currentSession,
              messages: state.currentSession.messages.map(msg =>
                msg.id === id ? { ...msg, ...updates } : msg
              ),
              updatedAt: new Date(),
            };

            return {
              currentSession: updatedSession,
              sessions: state.sessions.map(s => 
                s.id === updatedSession.id ? updatedSession : s
              ),
            };
          });
        },

        updateSessionTitle: (sessionId, title) => {
          set((state) => {
            const updatedSessions = state.sessions.map(session => 
              session.id === sessionId 
                ? { ...session, title, updatedAt: new Date() }
                : session
            );
            
            const updatedCurrentSession = state.currentSession?.id === sessionId
              ? { ...state.currentSession, title, updatedAt: new Date() }
              : state.currentSession;

            return {
              sessions: updatedSessions,
              currentSession: updatedCurrentSession,
            };
          });
        },

        clearCurrentSession: () => {
          const { createSession } = get();
          createSession();
        },

        setStreaming: (isStreaming) => set({ isStreaming }),
        setUploading: (isUploading) => set({ isUploading }),
        setError: (error) => set({ error }),

        regenerateLastMessage: () => {
          set((state) => {
            if (!state.currentSession) return state;
            
            const messages = state.currentSession.messages;
            const lastAssistantIndex = messages.findLastIndex(m => m.role === 'assistant');
            
            if (lastAssistantIndex === -1) return state;

            const updatedSession = {
              ...state.currentSession,
              messages: messages.slice(0, lastAssistantIndex),
              updatedAt: new Date(),
            };

            return {
              currentSession: updatedSession,
              sessions: state.sessions.map(s => 
                s.id === updatedSession.id ? updatedSession : s
              ),
            };
          });
        },
      }),
      {
        name: 'ai-buddy-chat-storage',
        partialize: (state) => ({ 
          sessions: state.sessions,
          currentSession: state.currentSession 
        }),
      }
    ),
    { name: 'ai-buddy-chat-store' }
  )
);