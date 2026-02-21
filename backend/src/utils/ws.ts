import { v4 as uuid } from "uuid";
import { type Server, WebSocket, WebSocketServer } from "ws";
import "dotenv/config";

interface WSMessage {
  type: string;
  payload?: any;
}

class WebSocketService {
  readonly wss: Server;
  private counter: number = 0;
  private clientsMap: Map<number | string, WebSocket>;

  constructor(port = Number(process.env.WEBSOCKET_PORT)) {
    if (!port) {
      throw new Error("No PORT for WS");
    }

    this.clientsMap = new Map();
    this.wss = new WebSocketServer({ port: port });
    console.log("The Websocket Server is active in PORT", port);

    this.wss.on("connection", (socket: WebSocket) => {
      const client_id = this.counter++;
      this.clientsMap.set(client_id, socket);

      console.log(
        `Client connected with ID: ${client_id}. Total clients: ${this.clientsMap.size}`,
      );

      socket.send(
        JSON.stringify({
          type: "message",
          payload: {
            message: "Connected to the websocket with the id",
            client_id,
          },
        }),
      );

      socket.on("message", (message) => {
        try {
          const data: WSMessage = JSON.parse(message.toString());
          console.log("Received from client:", data);
        } catch (error) {
          console.log("Something Failed When Getting Data From Client");
        }
      });

      socket.on("close", () => {
        console.log(
          `Socket ${client_id} is disconnecting. Total clients before: ${this.clientsMap.size}`,
        );
        this.clientsMap.delete(client_id);
        console.log(`Total clients after: ${this.clientsMap.size}`);
      });

      socket.on("error", (error) => {
        console.error(`Socket ${client_id} error:`, error.message);
      });
    });

    // Handle server errors
    this.wss.on("error", (error) => {
      console.error("WebSocket Server error:", error.message);
    });
  }

  sendMessage(socket: WebSocket, data: WSMessage) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
      return true;
    } else {
      console.warn(
        `Socket not open (readyState: ${socket?.readyState}), message not sent`,
      );
      return false;
    }
  }

  // FIXED: Return null instead of throwing error
  getSocket(client_id: number): WebSocket | null {
    const socket = this.clientsMap.get(client_id);
    if (!socket) {
      console.warn(
        `Cannot locate socket with ID ${client_id}. Available clients: ${Array.from(this.clientsMap.keys()).join(", ") || "none"}`,
      );
      return null; // Return null instead of throwing
    }

    // Check if socket is still open
    if (socket.readyState !== WebSocket.OPEN) {
      console.warn(
        `Socket for client ${client_id} exists but is not open (state: ${socket.readyState})`,
      );
      return null;
    }

    return socket;
  }

  // Check if client is connected
  isClientConnected(client_id: number): boolean {
    const socket = this.clientsMap.get(client_id);
    return socket ? socket.readyState === WebSocket.OPEN : false;
  }

  // Get all connected client IDs
  getAllClients(): any[] {
    return Array.from(this.clientsMap.keys());
  }
}

export default WebSocketService;

// Create the service - this will start the WebSocket server
const websocketService = new WebSocketService();
export { websocketService };
