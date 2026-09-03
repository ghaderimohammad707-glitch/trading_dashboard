/**
 * Hook for lazy-loading OHLC data when a symbol becomes visible
 * Uses IntersectionObserver — only fetches when element is in viewport
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { fetchHistoricalOHLC, getCachedOHLC, type OHLCBar } from "./historicalData";

interface UseLazyOHLCResult {
  bars: OHLCBar[];
  loading: boolean;
  error: boolean;
  ref: (node: HTMLElement | null) => void;
  retry: () => void;
}

export function useLazyOHLC(insCode: string | undefined): UseLazyOHLCResult {
  const [bars, setBars] = useState<OHLCBar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const fetchedRef = useRef(false);

  const doFetch = useCallback(async () => {
    if (!insCode || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    setError(false);

    // Check cache first
    const cached = getCachedOHLC(insCode);
    if (cached && cached.length > 0) {
      setBars(cached);
      setLoading(false);
      return;
    }

    try {
      const result = await fetchHistoricalOHLC(insCode, 60);
      if (result.length > 0) {
        setBars(result);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [insCode, fetchKey]);

  const ref = useCallback((node: HTMLElement | null) => {
    elementRef.current = node;
    if (!node || !insCode) return;

    // Check cache immediately
    const cached = getCachedOHLC(insCode);
    if (cached && cached.length > 0) {
      setBars(cached);
      fetchedRef.current = true;
      return;
    }

    if (fetchedRef.current) return;

    // Create observer
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            void doFetch();
            observerRef.current?.disconnect();
          }
        },
        { rootMargin: "200px" },
      );
    }

    observerRef.current.observe(node);
  }, [insCode, doFetch]);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const retry = useCallback(() => {
    fetchedRef.current = false;
    setFetchKey((k) => k + 1);
  }, []);

  return { bars, loading, error, ref, retry };
}
