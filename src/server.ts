import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import upload from "./utils/multer.js";
import { bullMqService } from "./utils/bullmq.js";
import { websocketService } from "./utils/ws.js";

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
app.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  const client_id = 0;
  if (!file) {
    return res.json({ message: "File is required" });
  }
  const job = await bullMqService.addToQueue({ file_location: file.path });
  if (!job.id) {
    return res.status(500).json({ message: "failed to create a job" });
  }
  bullMqService.getJobProgress(job.id as string, client_id).catch((err) => {
    console.log(err, "Failed to track the job progress");
  });
  res.send({
    message: "job has been added to the queue",
  });
});

app.listen(port, () => {
  console.log("Service is active on port ", port);
});
