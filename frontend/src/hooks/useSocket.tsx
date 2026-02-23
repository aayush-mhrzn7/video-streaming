import { useEffect, useState, useRef } from "react";

const WS_URL = "ws://localhost:8000";

let globalSocket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const useSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(globalSocket);
  const [clientId, setClientId] = useState<number | null>(() => {
    const stored = localStorage.getItem("ws_client_id");
    return stored ? Number(stored) : null;
  });

  const attemptsRef = useRef(0);

  useEffect(() => {
    if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
      setSocket(globalSocket);
      return;
    }

    const connect = () => {
      if (globalSocket?.readyState === WebSocket.CONNECTING) return;

      const ws = new WebSocket(WS_URL);
      globalSocket = ws;

      ws.onopen = () => {
        attemptsRef.current = 0;
        setSocket(ws);
        console.log("WS connected");
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);

          if (data.payload?.client_id !== undefined) {
            const id = data.payload.client_id;
            localStorage.setItem("ws_client_id", String(id));
            setClientId(id);
          }
        } catch {}
      };

      ws.onclose = () => {
        globalSocket = null;
        setSocket(null);

        if (attemptsRef.current < 5) {
          attemptsRef.current++;
          reconnectTimer = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  return { socket, clientId };
};

export default useSocket;
