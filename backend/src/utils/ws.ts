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
  private clientsMap: Map<string, WebSocket>;
  constructor(port = Number(process.env.WEBSOCKET_PORT)) {
    if (!port) {
      throw new Error("No PORT for WS");
    }

    this.clientsMap = new Map();
    this.wss = new WebSocketServer({ port: port });
    console.log("The Websocket Server is active in PORT", port);
    this.wss.on("connection", (socket: WebSocket) => {
      const client_id = String(this.counter++);
      this.clientsMap.set(client_id, socket);

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
          console.log("Client send this", data);
        } catch (error) {
          console.log("Something Failed When Getting Data From Client");
        }
      });
      socket.on("close", () => {
        console.log("Socket is disconnecting", client_id);
        this.clientsMap.delete(client_id);
      });
    });
  }
  sendMessage(socket: WebSocket, data: WSMessage) {
    if (socket.readyState == WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }
  getSocket(client_id: string): WebSocket {
    const socket = this.clientsMap.get(client_id);
    if (!socket) {
      throw new Error("Cannot Locate Socket with the id" + ` ${client_id}`);
    }
    return socket;
  }
  getAllClients(): any[] {
    return Array.from(this.clientsMap.keys());
  }
}

export default WebSocketService;

const websocketService = new WebSocketService();
export { websocketService };
