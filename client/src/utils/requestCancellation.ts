/**
 * Request cancellation utility for React components
 * Helps prevent memory leaks and race conditions
 */

import { useEffect, useRef } from 'react';

export interface CancellablePromise<T> {
  promise: Promise<T>;
  cancel: () => void;
}

/**
 * Create a cancellable promise
 */
export function makeCancellable<T>(promise: Promise<T>): CancellablePromise<T> {
  let isCancelled = false;

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise
      .then((value) => {
        if (!isCancelled) {
          resolve(value);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          reject(error);
        }
      });
  });

  return {
    promise: wrappedPromise,
    cancel: () => {
      isCancelled = true;
    },
  };
}

/**
 * React hook for cancelling promises on unmount
 */
export function useCancellablePromise() {
  const promises = useRef<CancellablePromise<any>[]>([]);

  useEffect(() => {
    return () => {
      // Cancel all promises on unmount
      promises.current.forEach((p) => p.cancel());
      promises.current = [];
    };
  }, []);

  const addPromise = <T>(cancellable: CancellablePromise<T>): Promise<T> => {
    promises.current.push(cancellable);
    return cancellable.promise;
  };

  const cancelAll = () => {
    promises.current.forEach((p) => p.cancel());
    promises.current = [];
  };

  return { addPromise, cancelAll };
}

/**
 * AbortController wrapper for fetch requests
 */
export function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      // Abort any pending requests on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const createAbortController = (): AbortController => {
    // Cancel previous controller if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  };

  const abort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  return { createAbortController, abort };
}

