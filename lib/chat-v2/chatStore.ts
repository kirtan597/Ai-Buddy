import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ChatState, ChatSession, Message } from '@/types/chat-v2';
import { nanoid } from 'nanoid';

interface ChatActions {
  createSession: () => void;
  // New action to set sessions from API
  setSessions: (sessions: ChatSession[]) => void;
  fetchMessages: (sessionId: string) => Promise<void>;
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
  // Guest mode tracking
  incrementGuestMessageCount: () => void;
  resetGuestMessageCount: () => void;
}

interface ChatStateExtended extends ChatState {
  guestMessageCount: number;
}

export const useChatStore = create<ChatStateExtended & ChatActions>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        currentSession: null,
        sessions: [],
        isStreaming: false,
        isUploading: false,
        error: null,
        guestMessageCount: 0,

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

        setSessions: (sessions) => {
          set((state) => {
            // Merge with existing sessions to preserve messages
            // We want to use the new session metadata (title, time) from `sessions`
            // But we want to keep the `messages` array from `state.sessions` if it's not empty.
            if (!sessions) return state; // Safety check

            const mergedSessions = sessions.map(newSession => {
              const existing = state.sessions.find(s => s.id === newSession.id);
              if (existing && existing.messages.length > 0) {
                return { ...newSession, messages: existing.messages };
              }
              return newSession;
            });

            // Try to keep the current session if it exists in the new list, otherwise select the first one or create new
            const currentId = state.currentSession?.id;
            const exists = mergedSessions.find(s => s.id === currentId);

            return {
              sessions: mergedSessions,
              currentSession: exists || mergedSessions[0] || null
            }
          });
        },

        fetchMessages: async (sessionId) => {
          try {
            const res = await fetch(`/api/conversation/${sessionId}/messages`);
            if (!res.ok) throw new Error('Failed to fetch messages');
            const messages = await res.json();

            set((state) => {
              // Map backend messages to frontend format
              // Assuming API returns array of messages
              const formattedMessages: Message[] = messages.map((m: any) => ({
                id: m._id || m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.createdAt || new Date()),
                attachments: m.attachments || [],
              }));

              const updatedSessions = state.sessions.map(s =>
                s.id === sessionId ? { ...s, messages: formattedMessages } : s
              );

              return {
                sessions: updatedSessions,
                currentSession: state.currentSession?.id === sessionId
                  ? { ...state.currentSession, messages: formattedMessages }
                  : state.currentSession
              };
            });
          } catch (error) {
            console.error('Error fetching messages:', error);
          }
        },

        switchToSession: (sessionId) => {
          set((state) => {
            const session = state.sessions.find(s => s.id === sessionId);
            // We also trigger fetchMessages here if needed? 
            // Better to let the component trigger it or trigger it here if store supports side effects well.
            // Zustand actions can be async. But `switchToSession` is currently sync in interface.
            // I'll keep it sync and let the component call fetchMessages.
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

        incrementGuestMessageCount: () => set((state) => ({ guestMessageCount: state.guestMessageCount + 1 })),
        resetGuestMessageCount: () => set({ guestMessageCount: 0 }),
      }),
      {
        name: 'ai-buddy-chat-storage',
        partialize: (state) => ({
          sessions: state.sessions,
          currentSession: state.currentSession,
          guestMessageCount: state.guestMessageCount
        }),
      }
    ),
    { name: 'ai-buddy-chat-store' }
  )
);