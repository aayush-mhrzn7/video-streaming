import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import "dotenv/config";
import BullMQService from "./utils/bullmq.js";
const app = express();
const port = Number(process.env.PORT);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/hls", express.static(path.join(__dirname, "./public/hls_output")));
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "./public/index.html"));
});
app.listen(port, () => {
  console.log("Service is active on port ", port);
});
