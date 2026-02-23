import { useContext, useEffect, useState } from "react";

import { createContext } from "react";

export interface SocketContextType {
  socket: WebSocket | null;
  clientId: number | null;
}

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  clientId: null,
});
const WS_URL = "ws://localhost:8000";

let socketInstance: WebSocket | null = null;

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<WebSocket | null>(socketInstance);
  const [clientId, setClientId] = useState<number | null>(null);

  useEffect(() => {
    if (socketInstance) {
      return;
    }

    const ws = new WebSocket(WS_URL);
    socketInstance = ws;

    ws.onopen = () => {
      setSocket(ws);
      console.log("WS connected");
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const payload = data.payload;
        if (payload != null && payload.client_id !== undefined) {
          setClientId(payload.client_id);
        }
      } catch {}
    };

    ws.onclose = () => {
      socketInstance = null;
      setSocket(null);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, clientId }}>
      {children}
    </SocketContext.Provider>
  );
};
export default function useSocket() {
  return useContext(SocketContext);
}
