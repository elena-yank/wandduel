import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: string;
  updateType?: string;
  data?: any;
  timestamp?: number;
  sessionId?: string;
  clientCount?: number;
}

interface UseWebSocketOptions {
  sessionId?: string;
  userId?: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const { sessionId, userId, onMessage, onConnect, onDisconnect } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    // Prevent multiple connections
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return; // Already connected or connecting
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/gamews`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();

        // Join session if sessionId is provided
        if (sessionId) {
          wsRef.current?.send(JSON.stringify({
            type: 'join_session',
            sessionId,
            userId
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message);

          // Handle different message types
         switch (message.type) {
           case 'session_update':
             // Invalidate relevant queries to trigger refetch
             if (message.updateType === 'round_completed') {
                queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId] });
                queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "spell-history"] });
             } else if (message.updateType === 'gesture_recognized') {
                queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId] });
             } else if (message.updateType === 'player_joined' || message.updateType === 'spectator_joined') {
               // Invalidate participants query to show new player/spectator
               queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'participants'] });
               queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId] });
             } else if (message.updateType === 'participant_left') {
               // Invalidate participants list after someone leaves
               queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'participants'] });
             } else if (message.updateType === 'attack_saved') {
               // Player selected which attack to use from multiple matches
               queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId] });
             }
             break;
           
            case 'server_time':
              // Update server time in query cache
              queryClient.setQueryData(['server-time'], {
                serverTime: new Date(message.timestamp!).toISOString(),
                timestamp: message.timestamp
              });
              break;
            
            case 'session_joined':
              console.log(`Joined session ${message.sessionId}, clients: ${message.clientCount}`);
              break;
          }

          // Call custom message handler
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        onDisconnect?.();

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('Failed to reconnect after multiple attempts');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, [sessionId, userId, onConnect, onDisconnect, onMessage, queryClient]);

  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket connection
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close(1000, 'Normal closure');
    }
    wsRef.current = null;
    setIsConnected(false);
    setConnectionError(null);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Connect on mount and when sessionId changes
  useEffect(() => {
    console.log('useWebSocket effect - sessionId:', sessionId, 'userId:', userId);
    if (sessionId && userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId, userId]); // Remove connect and disconnect from dependencies to prevent recreation loops

  return {
    isConnected,
    connectionError,
    sendMessage,
    connect,
    disconnect
  };
}
