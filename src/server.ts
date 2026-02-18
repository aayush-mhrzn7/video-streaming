import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import WebSocketService from "./utils/ws.js";
import "dotenv/config";
const app = express();
const port = Number(process.env.PORT);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const wsService = new WebSocketService();
app.use("/hls", express.static(path.join(__dirname, "./public/hls_output")));
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "./public/index.html"));
});
app.listen(port, () => {
  console.log("Service is active on port ", port);
});
