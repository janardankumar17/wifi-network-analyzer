"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketHookReturn {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (msg: string | object) => void;
}

// Local development fallback.
// In Render, NEXT_PUBLIC_WS_URL will be used.
const DEFAULT_WS_URL = "ws://localhost:8000/ws";

export function useWebSocket(
  url: string = process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS_URL
): WebSocketHookReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let shouldReconnect = true;
    let timer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        ws = new WebSocket(url);
        socketRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);
          } catch {
            setLastMessage(event.data);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);

          if (shouldReconnect) {
            timer = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (shouldReconnect) {
          timer = setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      shouldReconnect = false;
      clearTimeout(timer);

      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [url]);

  const sendMessage = useCallback((msg: string | object) => {
    if (
      socketRef.current &&
      socketRef.current.readyState === WebSocket.OPEN
    ) {
      const payload =
        typeof msg === "string" ? msg : JSON.stringify(msg);

      socketRef.current.send(payload);
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}