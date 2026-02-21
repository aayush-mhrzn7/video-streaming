import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import upload from "./utils/multer.js";
import { bullMqService } from "./utils/bullmq.js";
import { websocketService } from "./utils/ws.js";
import type { Job } from "bullmq";

const userJobsMap = new Map<number, string[]>();
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
    return res.status(400).json({ message: "File is required" });
  }

  const job = await bullMqService.addToQueue({ file_location: file.path });

  if (!job.id) {
    return res.status(500).json({ message: "failed to create a job" });
  }

  const jobs = userJobsMap.get(client_id) ?? [];
  jobs.push(String(job.id));
  userJobsMap.set(client_id, jobs);

  // ⭐ Start realtime tracking ONCE
  bullMqService.getJobProgress(String(job.id), client_id);

  res.json({
    message: "job added",
    jobId: job.id,
  });
});
app.get("/active-jobs", async (req, res) => {
  const user_id = 0;

  const userJobs = userJobsMap.get(user_id) ?? [];

  const results = await Promise.all(
    userJobs.map(async (jobId) => {
      const job = await bullMqService["queue"].getJob(jobId);

      if (!job) return null;

      return {
        id: job.id,
        progress: job.progress,
        state: await job.getState(),
      };
    }),
  );

  res.json({
    jobs: results.filter(Boolean),
  });
});

app.get("/active-jobs", async (req, res) => {
  const user_id = 0;

  const userJobs = userJobsMap.get(user_id) ?? [];

  const results = await Promise.all(
    userJobs.map(async (jobId) => {
      const job = await bullMqService["queue"].getJob(jobId);

      if (!job) return null;

      return {
        id: job.id,
        progress: job.progress,
        state: await job.getState(),
      };
    }),
  );

  res.json({
    jobs: results.filter(Boolean),
  });
});
app.listen(port, () => {
  console.log("Service is active on port ", port);
  console.log(
    "---------------------------------------------- INIT -----------------------------------------------------",
  );
});
