// hooks/useSocket.ts
import { useEffect, useState, useRef, useCallback } from "react";

interface StoredClientInfo {
  clientId: number;
  timestamp: number;
}

// Singleton pattern - store WebSocket instance outside the hook
let globalSocket: WebSocket | null = null;
let globalClientId: number | null = null;
let connectionAttempts = 0;
const maxReconnectAttempts = 5;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let listeners: Set<(clientId: number) => void> = new Set();
let isConnecting = false;

const useSocket = () => {
  const [socket, setSocket] = useState<WebSocket | undefined>(
    globalSocket || undefined,
  );
  const [clientId, setClientId] = useState<number | null>(globalClientId);
  const wsRef = useRef<WebSocket | null>(globalSocket);

  // Function to get stored client info
  const getStoredClientInfo = useCallback((): StoredClientInfo | null => {
    const stored = localStorage.getItem("websocket_client");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  // Function to store client info
  const storeClientInfo = useCallback((clientId: number) => {
    const info: StoredClientInfo = {
      clientId,
      timestamp: Date.now(),
    };
    localStorage.setItem("websocket_client", JSON.stringify(info));
  }, []);

  useEffect(() => {
    // If we already have a global socket and it's open, use it
    if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
      wsRef.current = globalSocket;
      setSocket(globalSocket);
      if (globalClientId) {
        setClientId(globalClientId);
      }
      return;
    }

    const WS_URL = "ws://localhost:8000";

    const connectWebSocket = () => {
      // Prevent multiple connection attempts
      if (isConnecting) return;

      // Don't create a new connection if one already exists and is open or connecting
      if (globalSocket) {
        if (
          globalSocket.readyState === WebSocket.OPEN ||
          globalSocket.readyState === WebSocket.CONNECTING
        ) {
          return;
        }
        // Clean up dead socket
        globalSocket = null;
      }

      isConnecting = true;

      try {
        console.log(`Connecting to WebSocket at ${WS_URL}...`);
        const webSocket = new WebSocket(WS_URL);
        globalSocket = webSocket;
        wsRef.current = webSocket;

        webSocket.onopen = () => {
          console.log("WebSocket connected successfully");
          setSocket(webSocket);
          connectionAttempts = 0;
          isConnecting = false;
        };

        webSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Check if this is the initial connection message with client_id
            if (
              data.type === "message" &&
              data.payload?.client_id !== undefined
            ) {
              const newClientId = data.payload.client_id;
              console.log("Received client ID from server:", newClientId);
              globalClientId = newClientId;
              setClientId(newClientId);
              storeClientInfo(newClientId);

              // Notify all listeners
              listeners.forEach((listener) => listener(newClientId));
            }
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        webSocket.onclose = (event) => {
          console.log(
            "WebSocket closed:",
            event.reason || "No reason provided",
          );

          // Only clear if this is still the global socket
          if (globalSocket === webSocket) {
            globalSocket = null;
            setSocket(undefined);
            isConnecting = false;

            // Attempt to reconnect if not a normal closure and within max attempts
            if (connectionAttempts < maxReconnectAttempts && !event.wasClean) {
              const delay = 3000 * Math.min(connectionAttempts + 1, 3);
              console.log(
                `Reconnecting in ${delay / 1000}s... (${connectionAttempts + 1}/${maxReconnectAttempts})`,
              );

              if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
              }

              reconnectTimeout = setTimeout(() => {
                connectionAttempts++;
                connectWebSocket();
              }, delay);
            }
          }
        };

        webSocket.onerror = (error) => {
          console.error("WebSocket error:", error);
          isConnecting = false;
        };
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
        globalSocket = null;
        setSocket(undefined);
        isConnecting = false;
      }
    };

    // Check for stored client ID on mount
    const stored = getStoredClientInfo();
    if (stored && !globalClientId) {
      console.log("Found stored client ID:", stored.clientId);
      globalClientId = stored.clientId;
      setClientId(stored.clientId);
    }

    connectWebSocket();

    return () => {
      // Don't close the socket on unmount - let other components use it
      // Only clean up timeouts
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };
  }, [getStoredClientInfo, storeClientInfo]);

  return { socket, clientId };
};

export default useSocket;
