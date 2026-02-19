import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import upload from "./utils/multer.js";
import { bullMqService } from "./utils/bullmq.js";

const app = express();
const port = Number(process.env.PORT);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/hls", express.static(path.join(__dirname, "./public/hls_output")));
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "./public/index.html"));
});
app.get("/upload", (_, res) => {
  res.sendFile(path.join(__dirname, "./public/upload.html"));
});
app.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.json({ message: "File is required" });
  }
  const file_location = path.join(__dirname, "..", file.path);

  bullMqService.addToQueue({ file_location: file.path });

  res.json({ message: "ok" });
});

app.listen(port, () => {
  console.log("Service is active on port ", port);
});
