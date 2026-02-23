import { type Server, WebSocket, WebSocketServer } from "ws";
import "dotenv/config";

interface WSMessage {
  type: string;
  payload?: any;
}

interface ClientSession {
  socket: WebSocket;
  lastSeen: number;
}

class WebSocketService {
  readonly wss: Server;
  private sessions: Map<string, ClientSession> = new Map();
  private readonly SESSION_TTL = 30 * 60 * 1000;

  constructor(port = Number(process.env.WEBSOCKET_PORT)) {
    if (!port) {
      throw new Error("No PORT for WS");
    }

    this.wss = new WebSocketServer({ port });
    console.log("The Websocket Server is active in PORT", port);

    setInterval(() => this.cleanStaleSessions(), 5 * 60 * 1000);

    this.wss.on("connection", (socket: WebSocket, req: any) => {
      const url = new URL(req.url!, `ws://localhost`);
      const previousId = url.searchParams.get("clientId");

      let client_id: string;

      if (previousId && this.sessions.has(previousId)) {
        client_id = previousId;
        this.sessions.get(client_id)!.socket = socket;
        this.sessions.get(client_id)!.lastSeen = Date.now();
      } else {
        client_id = crypto.randomUUID();
        this.sessions.set(client_id, { socket, lastSeen: Date.now() });
      }

      socket.send(
        JSON.stringify({
          type: "connection_ack",
          payload: {
            message: "Connected to the websocket with the id",
            client_id,
          },
        }),
      );

      socket.on("message", (message) => {
        try {
          const data: WSMessage = JSON.parse(message.toString());
          this.sessions.get(client_id)!.lastSeen = Date.now();
          console.log("Client send this", data);
        } catch (error) {
          console.log("Something Failed When Getting Data From Client");
        }
      });

      socket.on("close", (code) => {
        console.log("Socket is disconnecting", client_id);
        if (code === 1000) {
          this.sessions.delete(client_id);
          console.log("Session cleared for", client_id);
        }
      });

      socket.on("error", () => socket.close());
    });
  }

  private cleanStaleSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      const isStale = now - session.lastSeen > this.SESSION_TTL;
      const isDead =
        session.socket.readyState === WebSocket.CLOSED ||
        session.socket.readyState === WebSocket.CLOSING;

      if (isStale || isDead) {
        this.sessions.delete(id);
        console.log("Cleaned stale session", id);
      }
    }
  }

  sendMessage(socket: WebSocket, data: WSMessage) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }

  sendMessageById(client_id: string, data: WSMessage) {
    const session = this.sessions.get(client_id);
    if (session?.socket.readyState === WebSocket.OPEN) {
      session.socket.send(JSON.stringify(data));
    }
  }

  broadcast(data: WSMessage, excludeId?: string) {
    this.sessions.forEach((session, id) => {
      if (id !== excludeId && session.socket.readyState === WebSocket.OPEN) {
        session.socket.send(JSON.stringify(data));
      }
    });
  }

  getSocket(client_id: string): WebSocket {
    const session = this.sessions.get(client_id);
    if (!session) {
      throw new Error("Cannot Locate Socket with the id" + ` ${client_id}`);
    }
    return session.socket;
  }

  getAllClients(): string[] {
    return Array.from(this.sessions.keys());
  }
}

export default WebSocketService;
const websocketService = new WebSocketService();
export { websocketService };
