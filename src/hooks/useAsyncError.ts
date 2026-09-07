/**
 * Utility hooks for error handling and retry logic
 */
import { useState, useCallback, useEffect } from "react";

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retryCount: number;
}

interface UseAsyncActions<T> {
  setData: (data: T) => void;
  setError: (error: Error) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
  retry: () => Promise<void>;
}

/**
 * Hook for managing async state with retry capability
 */
export function useAsyncWithRetry<T>(
  asyncFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    initialData?: T;
  } = {}
): [UseAsyncState<T>, UseAsyncActions<T>] {
  const { maxRetries = 3, retryDelay = 1000, initialData } = options;
  
  const [state, setState] = useState<UseAsyncState<T>>({
    data: initialData ?? null,
    loading: false,
    error: null,
    retryCount: 0,
  });

  const [retryAttempt, setRetryAttempt] = useState(0);

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await asyncFn();
      setState(prev => ({ ...prev, data, loading: false, error: null }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState(prev => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, [asyncFn]);

  const retry = useCallback(async () => {
    if (state.retryCount >= maxRetries) {
      console.warn('[useAsyncWithRetry] Max retries reached');
      return;
    }

    const delay = retryDelay * Math.pow(2, state.retryCount);
    
    setTimeout(() => {
      setRetryAttempt(prev => prev + 1);
      setState(prev => ({ 
        ...prev, 
        retryCount: prev.retryCount + 1,
        loading: true,
        error: null 
      }));
      
      execute().catch(console.error);
    }, delay);
  }, [state.retryCount, maxRetries, retryDelay, execute]);

  useEffect(() => {
    if (retryAttempt > 0) {
      execute().catch(console.error);
    }
  }, [retryAttempt, execute]);

  const actions: UseAsyncActions<T> = {
    setData: (data) => setState(prev => ({ ...prev, data })),
    setError: (error) => setState(prev => ({ ...prev, error })),
    setLoading: (loading) => setState(prev => ({ ...prev, loading })),
    reset: () => setState({
      data: initialData ?? null,
      loading: false,
      error: null,
      retryCount: 0,
    }),
    retry,
  };

  return [state, actions];
}

/**
 * Simple hook for fetch with retry logic
 */
export function useFetchWithRetry<T>(
  url: string,
  options: RequestInit & {
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): UseAsyncState<T> & { refetch: () => Promise<void> } {
  const { maxRetries = 3, retryDelay = 1000, ...fetchOptions } = options;
  
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: true,
    error: null,
    retryCount: 0,
  });

  const fetchWithRetry = useCallback(async (attempt = 0) => {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setState(prev => ({ ...prev, data, loading: false, error: null }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`[useFetchWithRetry] Retrying in ${delay}ms (${attempt + 1}/${maxRetries})`);
        
        setTimeout(() => {
          fetchWithRetry(attempt + 1);
        }, delay);
      } else {
        setState(prev => ({ 
          ...prev, 
          error, 
          loading: false,
          retryCount: attempt + 1 
        }));
      }
    }
  }, [url, maxRetries, retryDelay, fetchOptions]);

  useEffect(() => {
    fetchWithRetry();
  }, [fetchWithRetry]);

  return {
    ...state,
    refetch: () => fetchWithRetry(),
  };
}

/**
 * Hook for managing API call errors with toast notifications
 */
export function useApiErrorHandling() {
  const handleError = useCallback((error: Error, context?: string) => {
    console.error(`[API Error${context ? ` - ${context}` : ""}]:`, error);
    
    // You can integrate with a toast library here
    // e.g., toast.error(`${context || 'خطا'}: ${error.message}`);
    
    return {
      message: error.message,
      context,
      timestamp: Date.now(),
    };
  }, []);

  const wrapAsync = useCallback(async <T,>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<{ data?: T; error?: Error }> => {
    try {
      const data = await fn();
      return { data };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, context);
      return { error };
    }
  }, [handleError]);

  return { handleError, wrapAsync };
}
