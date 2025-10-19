import { useEffect, useRef, useState, useCallback } from 'react';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface UseReconnectingWebSocketProps {
  url: string;
  onMessage: (event: MessageEvent) => void;
  enabled?: boolean;
  maxRetries?: number;
  baseDelay?: number;
}

interface PendingMessage {
  data: string;
  timestamp: number;
}

export function useReconnectingWebSocket({
  url,
  onMessage,
  enabled = true,
  maxRetries = 10,
  baseDelay = 1000,
}: UseReconnectingWebSocketProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [retryCount, setRetryCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMessagesRef = useRef<PendingMessage[]>([]);
  const isIntentionalClose = useRef(false);
  const retryCountRef = useRef(0); // Use ref to avoid closure issues

  // Send message with queueing support during disconnection
  const sendMessage = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
      return true;
    } else {
      // Queue message if disconnected
      pendingMessagesRef.current.push({
        data,
        timestamp: Date.now(),
      });
      console.log('Message queued (WebSocket disconnected):', data.substring(0, 50));
      return false;
    }
  }, []);

  // Send all pending messages (safely - only clear queue if all sends succeed)
  const flushPendingMessages = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && pendingMessagesRef.current.length > 0) {
      console.log(`Flushing ${pendingMessagesRef.current.length} pending messages`);
      
      const failedMessages: PendingMessage[] = [];
      
      pendingMessagesRef.current.forEach((msg) => {
        try {
          wsRef.current?.send(msg.data);
        } catch (error) {
          console.error('Failed to send queued message:', error);
          // Keep failed message for retry
          failedMessages.push(msg);
        }
      });
      
      // Only keep messages that failed to send
      pendingMessagesRef.current = failedMessages;
      
      if (failedMessages.length === 0) {
        console.log('All pending messages sent successfully');
      } else {
        console.log(`${failedMessages.length} messages failed to send, will retry`);
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !url) return;

    // Clear any existing connection
    if (wsRef.current) {
      isIntentionalClose.current = true;
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connected');
        setRetryCount(0);
        retryCountRef.current = 0; // Reset ref too
        isIntentionalClose.current = false;
        
        // Send any pending messages
        flushPendingMessages();
      };

      ws.onmessage = (event) => {
        onMessage(event);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        wsRef.current = null;

        // Only attempt reconnection if not intentionally closed
        if (!isIntentionalClose.current && enabled) {
          setStatus('reconnecting');

          if (retryCountRef.current < maxRetries) {
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s, etc. (max 30s)
            const delay = Math.min(baseDelay * Math.pow(2, retryCountRef.current), 30000);
            console.log(`Reconnecting in ${delay}ms (attempt ${retryCountRef.current + 1}/${maxRetries})`);

            reconnectTimeoutRef.current = setTimeout(() => {
              retryCountRef.current += 1;
              setRetryCount(retryCountRef.current); // Update state for UI
              connect();
            }, delay);
          } else {
            console.log('Max reconnection attempts reached');
            setStatus('disconnected');
          }
        } else {
          setStatus('disconnected');
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setStatus('disconnected');
    }
  }, [url, enabled, retryCount, maxRetries, baseDelay, onMessage, flushPendingMessages]);

  // Manual reconnect (resets retry counter)
  const reconnect = useCallback(() => {
    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset counters
    setRetryCount(0);
    retryCountRef.current = 0;
    
    // Ensure the new attempt will trigger auto-retry on failure
    isIntentionalClose.current = false;
    
    connect();
  }, [connect]);

  // Cleanup on unmount or when disabled
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      isIntentionalClose.current = true;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [enabled, url]);

  return {
    status,
    retryCount,
    maxRetries,
    sendMessage,
    reconnect,
    pendingCount: pendingMessagesRef.current.length,
  };
}
