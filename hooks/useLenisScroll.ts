import { useEffect, useRef, useState, useCallback } from 'react';
import Lenis from 'lenis';

interface LenisScrollOptions {
  duration?: number;
  easing?: (t: number) => number;
  smooth?: boolean;
  autoScroll?: boolean;
  threshold?: number;
}

export function useLenisScroll(options: LenisScrollOptions = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Use refs for transient values to avoid re-renders on every scroll tick
  const isUserScrollingRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const isAtBottomRef = useRef(true);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only state that needs to drive UI updates
  const [isAtBottom, setIsAtBottom] = useState(true);

  const {
    duration = 1.2,
    easing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    autoScroll = true,
    threshold = 100,
  } = options;

  // ─── Start / stop the rAF loop on demand ───────────────────────────────────
  const startRaf = useCallback(() => {
    if (rafIdRef.current !== null) return; // already running
    function tick(time: number) {
      lenisRef.current?.raf(time);
      rafIdRef.current = requestAnimationFrame(tick);
    }
    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  const stopRaf = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // ─── Lenis initialisation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!scrollRef.current) return;

    const lenis = new Lenis({
      duration,
      easing,
      wrapper: scrollRef.current,
      content: scrollRef.current.firstElementChild as HTMLElement,
    });

    lenisRef.current = lenis;

    lenis.on('scroll', (e: any) => {
      const { scroll, limit } = e;
      const nearBottom = limit - scroll < threshold;

      isAtBottomRef.current = nearBottom;
      setIsAtBottom(nearBottom);

      // Programmatic scroll also fires this, so only re-engage autoScroll if we naturally hit bottom.
      if (nearBottom) {
        shouldAutoScrollRef.current = true;
      }
    });

    // ─── Native User Interaction Tracking ────────────────────────────────────
    // If the user physically tries to scroll (wheel or touch), we break the auto-scroll lock.
    const handleUserInteraction = (e: WheelEvent | TouchEvent) => {
      // If it's a wheel event scrolling up, or just any touch/wheel interaction, 
      // we temporarily lift the restriction to let them roam freely.
      const isScrollUp = e instanceof WheelEvent ? e.deltaY < 0 : true; 
      
      if (isScrollUp || !isAtBottomRef.current) {
        shouldAutoScrollRef.current = false;
        
        // Let Lenis stop the current tween immediately so user regains control
        lenis.stop();
        lenis.start(); 
      }
    };

    const node = scrollRef.current;
    node.addEventListener('wheel', handleUserInteraction, { passive: true });
    node.addEventListener('touchmove', handleUserInteraction, { passive: true });

    startRaf();

    return () => {
      stopRaf();
      node.removeEventListener('wheel', handleUserInteraction);
      node.removeEventListener('touchmove', handleUserInteraction);
      lenis.destroy();
      lenisRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, startRaf, threshold]);

  // ─── Scroll helpers ─────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(
    (animated = true) => {
      if (!lenisRef.current) return;

      if (!animated) {
        // Instant jump — bypass Lenis
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        return;
      }

      startRaf(); // ensure loop is running for the animation
      lenisRef.current.scrollTo('bottom', { duration, easing });
    },
    [duration, easing, startRaf],
  );

  const scrollToTop = useCallback(
    (animated = true) => {
      if (!lenisRef.current) return;
      startRaf();
      lenisRef.current.scrollTo('top', { duration: animated ? duration : 0, easing: animated ? easing : undefined });
    },
    [duration, easing, startRaf],
  );

  const scrollToElement = useCallback(
    (target: string | HTMLElement, animated = true) => {
      if (!lenisRef.current) return;
      startRaf();
      lenisRef.current.scrollTo(target, {
        duration: animated ? duration : 0,
        easing: animated ? easing : undefined,
        offset: -20,
      });
    },
    [duration, easing, startRaf],
  );

  const forceScrollToBottom = useCallback(() => {
    isUserScrollingRef.current = false;
    shouldAutoScrollRef.current = true;
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    requestAnimationFrame(() => scrollToBottom(true));
  }, [scrollToBottom]);

  const stopScroll = useCallback(() => lenisRef.current?.stop(), []);
  const startScroll = useCallback(() => lenisRef.current?.start(), []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  return {
    scrollRef,
    lenis: lenisRef.current,
    scrollToBottom,
    scrollToTop,
    scrollToElement,
    forceScrollToBottom,
    stopScroll,
    startScroll,
    // Expose refs so callers can read without subscribing to state
    shouldAutoScroll: autoScroll ? shouldAutoScrollRef : { current: false },
    isUserScrollingRef,
    isAtBottom,
  };
}