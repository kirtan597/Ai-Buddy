import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatState, ChatSession, Message } from '@/types/chat-v2';
import { nanoid } from 'nanoid';

interface ChatActions {
  createSession: () => void;
  setSessions: (sessions: ChatSession[]) => void;
  fetchMessages: (sessionId: string) => Promise<void>;
  switchToSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  updateStreamingMessage: (id: string, content: string) => void;
  clearCurrentSession: () => void;
  setStreaming: (isStreaming: boolean) => void;
  setUploading: (isUploading: boolean) => void;
  setError: (error: string | null) => void;
  regenerateLastMessage: () => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  setModel: (model: string) => void;
  // Guest mode tracking
  incrementGuestMessageCount: () => void;
  resetGuestMessageCount: () => void;
}

interface ChatStateExtended extends ChatState {
  guestMessageCount: number;
  selectedModel: string;
}

export const useChatStore = create<ChatStateExtended & ChatActions>()(
  persist(
    (set, get) => ({
      // State
      currentSession: null,
      sessions: [],
      isStreaming: false,
      isUploading: false,
      error: null,
      guestMessageCount: 0,
      selectedModel: 'openai/gpt-4o-mini',

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
          if (!sessions) return state; // Safety check

          // Merge server sessions with local state, preserving cached messages
          const mergedSessions = sessions.map(newSession => {
            const existing = state.sessions.find(s => s.id === newSession.id);
            if (existing && existing.messages.length > 0) {
              // Keep locally-cached messages; server list only carries metadata
              return { ...newSession, messages: existing.messages };
            }
            return newSession;
          });

          const currentId = state.currentSession?.id;

          // Check if current session exists in the merged server list
          const currentInMerged = mergedSessions.find(s => s.id === currentId);

          // Check if current session is a local-only (not yet synced) session:
          // a local session won't be in the server list but should NOT be discarded.
          const currentIsLocalOnly =
            currentId &&
            !sessions.find((s: ChatSession) => s.id === currentId) &&
            state.sessions.find(s => s.id === currentId);

          let newCurrentSession: ChatSession | null;
          let finalSessions: ChatSession[];

          if (currentInMerged) {
            // Current session is known to the server — keep it
            newCurrentSession = currentInMerged;
            finalSessions = mergedSessions;
          } else if (currentIsLocalOnly) {
            // Current session is local-only (e.g. guest session or brand-new chat):
            // Keep it and prepend it so it's visible in the sidebar
            newCurrentSession = state.currentSession;
            finalSessions = [
              state.currentSession!,
              ...mergedSessions.filter(s => s.id !== currentId),
            ];
          } else {
            // Current session is gone or was never set — switch to first server session
            newCurrentSession = mergedSessions[0] || null;
            finalSessions = mergedSessions;
          }

          // If still no session at all, create a blank one so the UI is never stuck
          if (!newCurrentSession) {
            const blank: ChatSession = {
              id: nanoid(),
              title: 'New Chat',
              messages: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              settings: { model: 'openai/gpt-4o-mini', temperature: 0.7, maxTokens: 2000 },
            };
            finalSessions = [blank, ...finalSessions];
            newCurrentSession = blank;
          }

          return { sessions: finalSessions, currentSession: newCurrentSession };
        });
      },

      fetchMessages: async (sessionId) => {
        try {
          const res = await fetch(`/api/conversation/${sessionId}/messages`);
          if (!res.ok) {
            // DB offline or session not yet persisted — keep local state
            console.warn('Network/DB unavailable, using local history if available.');
            return;
          }
          const messages = await res.json();

          set((state) => {
            // Guard: if the user has already switched to a different session by
            // the time this response arrives, silently cache the messages in
            // sessions[] but do NOT change currentSession.
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

            // Only update currentSession if it's still the requested session
            const updatedCurrent =
              state.currentSession?.id === sessionId
                ? { ...state.currentSession, messages: formattedMessages }
                : state.currentSession;

            return { sessions: updatedSessions, currentSession: updatedCurrent };
          });
        } catch (error) {
          console.error('Error fetching messages (Offline mode):', error);
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

          let newCurrentSession: ChatSession | null =
            state.currentSession?.id === sessionId
              ? (updatedSessions[0] || null)
              : state.currentSession;

          // If all sessions were removed, auto-create a blank one so the UI
          // is never left in a null/blocked state
          if (!newCurrentSession) {
            const blank: ChatSession = {
              id: nanoid(),
              title: 'New Chat',
              messages: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              settings: { model: 'openai/gpt-4o-mini', temperature: 0.7, maxTokens: 2000 },
            };
            updatedSessions.push(blank);
            newCurrentSession = blank;
          }

          return { sessions: updatedSessions, currentSession: newCurrentSession };
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

      // Fast path: O(1) index lookup — no full array map during streaming
      updateStreamingMessage: (id, content) => {
        set((state) => {
          if (!state.currentSession) return state;
          const msgs = state.currentSession.messages;
          const idx = msgs.findIndex(m => m.id === id);
          if (idx === -1) return state;
          // Shallow-clone only the changed message, reuse the rest of the array
          const next = msgs.slice();
          next[idx] = { ...next[idx], content };
          return {
            currentSession: { ...state.currentSession, messages: next },
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
      setModel: (model) => set({ selectedModel: model }),

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
      // Only persist lightweight metadata — NEVER messages.
      // Persisting messages on every stream chunk tanks perf and fills localStorage.
      // Messages are always re-fetched from DB (fast: indexed by conversationId + createdAt).
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        currentSession: state.currentSession
          ? {
              id: state.currentSession.id,
              title: state.currentSession.title,
              messages: [],   // never persist messages
              createdAt: state.currentSession.createdAt,
              updatedAt: state.currentSession.updatedAt,
              settings: state.currentSession.settings,
            }
          : null,
        sessions: state.sessions.map(s => ({
          id: s.id,
          title: s.title,
          messages: [],       // strip messages from all sessions
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          settings: s.settings,
        })),
        guestMessageCount: state.guestMessageCount,
      }),
    }
  )
);