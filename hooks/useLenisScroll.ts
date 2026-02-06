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
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    duration = 1.2,
    easing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth = true,
    autoScroll = true,
    threshold = 100
  } = options;

  // Initialize Lenis
  useEffect(() => {
    if (!scrollRef.current) return;

    const lenis = new Lenis({
      duration,
      easing,
      wrapper: scrollRef.current,
      content: scrollRef.current.firstElementChild as HTMLElement,
    });

    lenisRef.current = lenis;

    // Animation frame loop
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Listen to scroll events
    lenis.on('scroll', handleLenisScroll);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [duration, easing, smooth]);

  const handleLenisScroll = useCallback((e: any) => {
    if (!scrollRef.current) return;

    const { scroll, limit } = e;
    const isNearBottom = limit - scroll < threshold;
    
    setIsAtBottom(isNearBottom);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // User is scrolling
    setIsUserScrolling(true);
    setShouldAutoScroll(isNearBottom);

    // Reset user scrolling after 1.5 seconds
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 1500);
  }, [threshold]);

  const scrollToBottom = useCallback((animated = true) => {
    if (!lenisRef.current) return;

    // For instant scrolling (session switching), use immediate scroll
    if (!animated) {
      // Force immediate scroll without any animation
      const element = scrollRef.current;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
      return;
    }

    lenisRef.current.scrollTo('bottom', {
      duration: duration,
      easing: easing,
    });
  }, [duration, easing, scrollRef]);

  const scrollToTop = useCallback((animated = true) => {
    if (!lenisRef.current) return;

    lenisRef.current.scrollTo('top', {
      duration: animated ? duration : 0,
      easing: animated ? easing : undefined,
    });
  }, [duration, easing]);

  const scrollToElement = useCallback((target: string | HTMLElement, animated = true) => {
    if (!lenisRef.current) return;

    lenisRef.current.scrollTo(target, {
      duration: animated ? duration : 0,
      easing: animated ? easing : undefined,
      offset: -20, // Small offset from top
    });
  }, [duration, easing]);

  const forceScrollToBottom = useCallback(() => {
    setIsUserScrolling(false);
    setShouldAutoScroll(true);
    setIsAtBottom(true);
    
    // Use requestAnimationFrame for smooth transition
    requestAnimationFrame(() => {
      scrollToBottom(true);
    });
  }, [scrollToBottom]);

  // Stop/start smooth scrolling
  const stopScroll = useCallback(() => {
    if (lenisRef.current) {
      lenisRef.current.stop();
    }
  }, []);

  const startScroll = useCallback(() => {
    if (lenisRef.current) {
      lenisRef.current.start();
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
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
    shouldAutoScroll: autoScroll ? shouldAutoScroll : false,
    isUserScrolling,
    isAtBottom,
  };
}