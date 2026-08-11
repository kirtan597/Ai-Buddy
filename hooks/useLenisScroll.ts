import { useEffect, useRef, useState, useCallback } from 'react';

interface ScrollOptions {
  duration?: number;
  smooth?: boolean;
  autoScroll?: boolean;
  threshold?: number;
}

export function useLenisScroll(options: ScrollOptions = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const isAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const { threshold = 120 } = options;

  // ── Track whether user has scrolled away from bottom ─────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const atBottom = distFromBottom < threshold;

      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);

      if (atBottom) {
        // Re-engage auto-scroll when user scrolls back to bottom
        shouldAutoScrollRef.current = true;
      } else {
        // User scrolled up — stop auto-scrolling
        shouldAutoScrollRef.current = false;
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [threshold]);

  // ── Scroll helpers ────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((animated = true) => {
    const el = scrollRef.current;
    if (!el) return;
    if (animated) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const forceScrollToBottom = useCallback(() => {
    shouldAutoScrollRef.current = true;
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    requestAnimationFrame(() => scrollToBottom(true));
  }, [scrollToBottom]);

  const scrollToTop = useCallback((animated = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: animated ? 'smooth' : 'instant' as ScrollBehavior });
  }, []);

  const scrollToElement = useCallback((target: string | HTMLElement, animated = true) => {
    const el = scrollRef.current;
    if (!el) return;
    const node = typeof target === 'string' ? document.querySelector(target) as HTMLElement : target;
    if (!node) return;
    const offset = node.offsetTop - 20;
    el.scrollTo({ top: offset, behavior: animated ? 'smooth' : 'instant' as ScrollBehavior });
  }, []);

  const stopScroll = useCallback(() => {
    // no-op for native scroll — kept for API compatibility
  }, []);

  const startScroll = useCallback(() => {
    // no-op for native scroll — kept for API compatibility
  }, []);

  const isUserScrollingRef = useRef(false);

  return {
    scrollRef,
    lenis: null,
    scrollToBottom,
    scrollToTop,
    scrollToElement,
    forceScrollToBottom,
    stopScroll,
    startScroll,
    shouldAutoScroll: options.autoScroll !== false ? shouldAutoScrollRef : { current: false },
    isUserScrollingRef,
    isAtBottom,
  };
}
