import { useState, useEffect, useRef, useCallback } from 'react';

const CONNECTION_TIMEOUT_MS = 30_000;

/**
 * Tracks real-time connection health for chat.
 *
 * - `isConnected` becomes true once the first data batch arrives
 * - A 30-second heartbeat resets on every new data batch
 * - If the timeout fires with no new data, `isConnected` flips to false
 * - When data arrives again, connection is restored
 */
export function useChatConnection(isLoading: boolean, hasData: boolean): {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  heartbeat: (messageCount: number) => void;
} {
  const [isConnected, setIsConnected] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageCountRef = useRef(0);

  const clearConnectionTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startConnectionTimeout = useCallback(() => {
    clearConnectionTimeout();
    timeoutRef.current = setTimeout(() => {
      setIsConnected(false);
    }, CONNECTION_TIMEOUT_MS);
  }, [clearConnectionTimeout]);

  // First data arrival
  useEffect(() => {
    if (!isLoading && hasData) {
      setIsConnected(true);
      lastMessageCountRef.current = hasData ? 1 : 0;
      startConnectionTimeout();
    }
  }, [isLoading, hasData, startConnectionTimeout]);

  // Reset on cleanup
  useEffect(() => {
    return () => clearConnectionTimeout();
  }, [clearConnectionTimeout]);

  // Expose a heartbeat function callers can invoke on every new data batch
  const heartbeat = useCallback(
    (messageCount: number) => {
      if (messageCount !== lastMessageCountRef.current) {
        lastMessageCountRef.current = messageCount;
        if (!isConnected) {
          setIsConnected(true);
        }
        startConnectionTimeout();
      }
    },
    [isConnected, startConnectionTimeout]
  );

  const isConnecting = isLoading && !hasData;
  const isReconnecting = !isLoading && !isConnected && hasData;

  return { isConnected, isConnecting, isReconnecting, heartbeat };
}
