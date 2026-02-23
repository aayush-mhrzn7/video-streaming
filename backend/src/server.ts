import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import upload from "./utils/multer.js";
import { bullMqService } from "./utils/bullmq.js";
import { websocketService } from "./utils/ws.js";
import cors from "cors";
import fs from "fs/promises";

const userJobsMap = new Map<string, string[]>(); // Changed to string keys
const app = express();
const port = Number(process.env.PORT);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use("/hls", express.static(path.join(__dirname, "./public/hls_output")));

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "./public/index.html"));
});

app.get("/upload", (_, res) => {
  res.sendFile(path.join(__dirname, "./public/upload.html"));
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  const client_id = req.body.clientId;
  console.log(client_id, file);
  if (!file) {
    return res.status(400).json({ message: "File is required" });
  }

  if (!client_id) {
    return res.status(400).json({ message: "Client ID is required" });
  }
  try {
    const job = await bullMqService.addToQueue({ file_location: file.path });
    if (!job.id) {
      return res.status(500).json({ message: "failed to create a job" });
    }
    const jobs = userJobsMap.get(client_id) ?? [];
    jobs.push(String(job.id));
    userJobsMap.set(client_id, jobs);
    bullMqService.getJobProgress(String(job.id), client_id);

    res.json({
      message: "job added",
      jobId: job.id,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/active-jobs", async (req, res) => {
  const client_id = req.query.clientId as string; // Get clientId from query params

  if (!client_id) {
    return res.status(400).json({ message: "Client ID is required" });
  }

  const userJobs = userJobsMap.get(client_id) ?? [];

  try {
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
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Error fetching jobs" });
  }
});
app.delete("/videos/:id", async (req, res) => {
  try {
    const folder = path.join(__dirname, "./public/hls_output", req.params.id);

    await fs.rm(folder, { recursive: true, force: true });

    res.json({ message: "Video deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
});
app.get("/videos", async (req, res) => {
  try {
    const hlsDir = path.join(__dirname, "./public/hls_output");

    const folders = await fs.readdir(hlsDir, { withFileTypes: true });

    const videos = await Promise.all(
      folders
        .filter((f) => f.isDirectory())
        .map(async (folder) => {
          const masterPath = path.join(hlsDir, folder.name, "master.m3u8");

          try {
            await fs.access(masterPath);

            return {
              id: folder.name,
              name: `Video ${folder.name}`,
              status: "ready",
              createdAt: new Date().toISOString(),
            };
          } catch {
            return null;
          }
        }),
    );

    res.json({
      videos: videos.filter(Boolean),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to read videos" });
  }
});

app.listen(port, () => {
  console.log("Service is active on port ", port);
  console.log(
    "---------------------------------------------- INIT -----------------------------------------------------",
  );
});
