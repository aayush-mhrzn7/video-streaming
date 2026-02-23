import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
const CLIENT_ID_KEY = "ws_client_id";

let globalSocket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let messageListeners: Set<(data: any) => void> = new Set();
let isIntentionalClose = false;

const useSocket = () => {
  const [isConnected, setIsConnected] = useState(
    () => globalSocket?.readyState === WebSocket.OPEN,
  );
  const [clientId, setClientId] = useState<string | null>(() =>
    localStorage.getItem(CLIENT_ID_KEY),
  );
  const attemptsRef = useRef(0);
  const MAX_ATTEMPTS = 10;

  const connect = useCallback((): void => {
    if (
      globalSocket?.readyState === WebSocket.OPEN ||
      globalSocket?.readyState === WebSocket.CONNECTING
    )
      return;

    const storedId = localStorage.getItem(CLIENT_ID_KEY);
    const url = storedId ? `${WS_URL}?clientId=${storedId}` : WS_URL;

    const ws = new WebSocket(url);
    globalSocket = ws;
    isIntentionalClose = false;

    ws.onopen = () => {
      attemptsRef.current = 0;
      setIsConnected(true);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "connection_ack" && data.payload?.client_id) {
          const id = String(data.payload.client_id);
          localStorage.setItem(CLIENT_ID_KEY, id);
          setClientId(id);
        }
        messageListeners.forEach((listener) => listener(data));
      } catch {
        console.warn("Failed to parse WS message");
      }
    };

    ws.onclose = (event) => {
      globalSocket = null;
      setIsConnected(false);

      if (isIntentionalClose || event.code === 1000) {
        localStorage.removeItem(CLIENT_ID_KEY);
        setClientId(null);
        attemptsRef.current = 0;
        return;
      }

      if (attemptsRef.current < MAX_ATTEMPTS) {
        const delay = Math.min(1000 * 2 ** attemptsRef.current, 30000);
        attemptsRef.current++;
        reconnectTimer = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    if (
      globalSocket?.readyState === WebSocket.OPEN ||
      globalSocket?.readyState === WebSocket.CONNECTING
    ) {
      setIsConnected(globalSocket.readyState === WebSocket.OPEN);
      return;
    }

    connect();

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };
  }, [connect]);

  const send = useCallback((type: string, payload?: any): void => {
    if (globalSocket?.readyState === WebSocket.OPEN) {
      globalSocket.send(JSON.stringify({ type, payload }));
    } else {
      console.warn("Socket not open — message dropped:", type);
    }
  }, []);

  const onMessage = useCallback(
    (type: string, handler: (payload: any) => void): (() => void) => {
      const listener = (data: any) => {
        if (data.type === type) handler(data.payload ?? data);
      };
      messageListeners.add(listener);
      return () => messageListeners.delete(listener);
    },
    [],
  );

  const disconnect = useCallback((): void => {
    isIntentionalClose = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    attemptsRef.current = MAX_ATTEMPTS;
    globalSocket?.close(1000, "User disconnected");
    globalSocket = null;
    localStorage.removeItem(CLIENT_ID_KEY);
    setClientId(null);
    setIsConnected(false);
  }, []);

  return { isConnected, clientId, send, onMessage, disconnect };
};

export default useSocket;
