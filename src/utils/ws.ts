import { type Server, WebSocket, WebSocketServer } from "ws";
import "dotenv/config";
interface WSMessage {
  type: string;
  payload?: any;
}
class WebSocketService {
  readonly wss: Server;
  private clients: Set<WebSocket>;
  constructor(port = Number(process.env.WEBSOCKET_PORT)) {
    if (!port) {
      throw new Error("No PORT for WS");
    }
    this.clients = new Set();
    this.wss = new WebSocketServer({ port: port });
    console.log("The Websocket Server is active in PORT", port);
    this.wss.on("connection", (socket: WebSocket) => {
      this.clients.add(socket);
      socket.on("message", (message) => {
        try {
          const data: WSMessage = JSON.parse(message.toString());
          console.log(data);
        } catch (error) {
          console.log("Something Failed When Getting Data From Client");
        }
      });
      socket.on("close", () => {
        console.log("Socket is disconnecting");
        this.clients.delete(socket);
      });
    });
  }
  sendMessage(socket: WebSocket, data: WSMessage) {
    if (socket.readyState == WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }
  getClients(): Set<WebSocket> {
    return this.clients;
  }
}

export default WebSocketService;

const websocketService = new WebSocketService();
export { websocketService };
