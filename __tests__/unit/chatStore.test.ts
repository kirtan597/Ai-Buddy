import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Reset store between tests
beforeEach(() => {
  vi.resetModules();
});

async function getStore() {
  const { useChatStore } = await import('@/lib/chat-v2/chatStore');
  return useChatStore;
}

describe('chatStore', () => {
  describe('createSession', () => {
    it('creates a new session and sets it as current', async () => {
      const store = await getStore();
      act(() => store.getState().createSession());
      const { currentSession, sessions } = store.getState();
      expect(currentSession).not.toBeNull();
      expect(sessions.length).toBeGreaterThanOrEqual(1);
      expect(currentSession?.title).toBe('New Chat');
      expect(currentSession?.messages).toHaveLength(0);
    });
  });

  describe('addMessage', () => {
    it('adds a user message to the current session', async () => {
      const store = await getStore();
      act(() => store.getState().createSession());
      act(() => store.getState().addMessage({ role: 'user', content: 'Hello AI' }));
      const msgs = store.getState().currentSession?.messages ?? [];
      expect(msgs).toHaveLength(1);
      expect(msgs[0].role).toBe('user');
      expect(msgs[0].content).toBe('Hello AI');
      expect(msgs[0].id).toBeTruthy();
    });

    it('auto-titles session from first user message', async () => {
      const store = await getStore();
      act(() => store.getState().createSession());
      act(() => store.getState().addMessage({ role: 'user', content: 'What is the meaning of life?' }));
      expect(store.getState().currentSession?.title).toContain('What is the meaning');
    });

    it('truncates long titles to 50 chars + ellipsis', async () => {
      const store = await getStore();
      act(() => store.getState().createSession());
      const longMsg = 'A'.repeat(80);
      act(() => store.getState().addMessage({ role: 'user', content: longMsg }));
      const title = store.getState().currentSession?.title ?? '';
      expect(title.length).toBeLessThanOrEqual(53); // 50 + '...'
    });
  });

  describe('updateMessage', () => {
    it('updates message content by id', async () => {
      const store = await getStore();
      act(() => store.getState().createSession());
      act(() => store.getState().addMessage({ role: 'assistant', content: 'old' }));
      const id = store.getState().currentSession!.messages[0].id;
      act(() => store.getState().updateMessage(id, { content: 'updated' }));
      expect(store.getState().currentSession?.messages[0].content).toBe('updated');
    });

    it('is a no-op for unknown id', async () => {
      const store = await getStore();
      act(() => store.getState().createSession());
      act(() => store.getState().addMessage({ role: 'user', content: 'msg' }));
      const before = store.getState().currentSession?.messages[0].content;
      act(() => store.getState().updateMessage('nonexistent-id', { content: 'x' }));
      expect(store.getState().currentSession?.messages[0].content).toBe(before);
    });
  });

  describe('updateStreamingMessage', () => {
    it('updates content without full array re-map', async () => {
      const store = await getStore();
      act(() => store.getState().createSession());
      act(() => store.getState().addMessage({ role: 'assistant', content: '' }));
      const id = store.getState().currentSession!.messages[0].id;
      act(() => store.getState().updateStreamingMessage(id, 'streamed content'));
      expect(store.getState().currentSession?.messages[0].content).toBe('streamed content');
    });
  });

  describe('deleteSession', () => {
    it('removes session and switches to next available', async () => {
      const store = await getStore();
      act(() => store.getState().createSession());
      act(() => store.getState().createSession());
      const idToDelete = store.getState().currentSession!.id;
      act(() => store.getState().deleteSession(idToDelete));
      expect(store.getState().currentSession?.id).not.toBe(idToDelete);
    });

    it('creates a blank session when last session is deleted', async () => {
      const store = await getStore();
      act(() => store.getState().createSession());
      const id = store.getState().currentSession!.id;
      act(() => store.getState().deleteSession(id));
      // After deleting the only session, a new blank one is auto-created
      expect(store.getState().currentSession).not.toBeNull();
      expect(store.getState().sessions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('updateSessionTitle', () => {
    it('updates title in both sessions array and currentSession', async () => {
      const store = await getStore();
      act(() => store.getState().createSession());
      const id = store.getState().currentSession!.id;
      act(() => store.getState().updateSessionTitle(id, 'My Custom Title'));
      expect(store.getState().currentSession?.title).toBe('My Custom Title');
      const inList = store.getState().sessions.find(s => s.id === id);
      expect(inList?.title).toBe('My Custom Title');
    });
  });

  describe('setModel', () => {
    it('updates selectedModel', async () => {
      const store = await getStore();
      act(() => store.getState().setModel('anthropic/claude-3.5-haiku'));
      expect(store.getState().selectedModel).toBe('anthropic/claude-3.5-haiku');
    });
  });

  describe('setStreaming / setError', () => {
    it('toggles streaming flag', async () => {
      const store = await getStore();
      act(() => store.getState().setStreaming(true));
      expect(store.getState().isStreaming).toBe(true);
      act(() => store.getState().setStreaming(false));
      expect(store.getState().isStreaming).toBe(false);
    });

    it('sets and clears error', async () => {
      const store = await getStore();
      act(() => store.getState().setError('Something went wrong'));
      expect(store.getState().error).toBe('Something went wrong');
      act(() => store.getState().setError(null));
      expect(store.getState().error).toBeNull();
    });
  });

  describe('guestMessageCount', () => {
    it('increments and resets guest message count', async () => {
      const store = await getStore();
      act(() => store.getState().incrementGuestMessageCount());
      act(() => store.getState().incrementGuestMessageCount());
      expect(store.getState().guestMessageCount).toBeGreaterThanOrEqual(2);
      act(() => store.getState().resetGuestMessageCount());
      expect(store.getState().guestMessageCount).toBe(0);
    });
  });

  describe('regenerateLastMessage', () => {
    it('removes the last assistant message', async () => {
      const store = await getStore();
      act(() => store.getState().createSession());
      act(() => store.getState().addMessage({ role: 'user', content: 'q' }));
      act(() => store.getState().addMessage({ role: 'assistant', content: 'a' }));
      expect(store.getState().currentSession?.messages).toHaveLength(2);
      act(() => store.getState().regenerateLastMessage());
      expect(store.getState().currentSession?.messages).toHaveLength(1);
      expect(store.getState().currentSession?.messages[0].role).toBe('user');
    });
  });

  describe('setSessions', () => {
    it('merges server sessions preserving local messages', async () => {
      const store = await getStore();
      act(() => store.getState().createSession());
      const localId = store.getState().currentSession!.id;
      act(() => store.getState().addMessage({ role: 'user', content: 'cached' }));

      const serverSessions = [
        {
          id: localId,
          title: 'Server Title',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: { model: 'openai/gpt-4o-mini', temperature: 0.7, maxTokens: 2000 },
        },
      ];
      act(() => store.getState().setSessions(serverSessions));
      const merged = store.getState().sessions.find(s => s.id === localId);
      expect(merged?.messages).toHaveLength(1); // local messages preserved
    });
  });
});
