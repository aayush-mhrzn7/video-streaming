import { Job, Queue, Worker } from "bullmq";
import generateHLSOutput from "./ffmpeg.js";
import { websocketService } from "./ws.js";

export default class BullMQService {
  private queue: Queue;
  private worker: Worker;
  readonly queue_name: string;

  constructor(queue_name: string) {
    console.log("BullMQ Service is active");
    const connection = { host: "localhost", port: 6379 };

    this.queue_name = queue_name;
    this.queue = new Queue(queue_name, { connection });

    this.worker = new Worker(
      queue_name,
      async (job: Job) => {
        const { file_location } = job.data;
        await job.updateProgress(0);
        await generateHLSOutput({
          input_path: file_location,
          onProgress: async (progress) => {
            await job.updateProgress(progress);
          },
        });

        await job.updateProgress(100);
      },
      {
        connection,
        concurrency: 4,
      },
    );
    this.worker.on("progress", (job, progress) => {
      console.log(`Job ${job.id} progress: ${progress}%`);
      websocketService.getClients().forEach((client) => {
        websocketService.sendMessage(client, {
          type: "progress",
          payload: {
            progress: progress,
          },
        });
      });
    });
    this.worker.on("failed", (job, err) => {
      if (job) {
        console.log(
          `Job ${job.id} failed attempt ${job.attemptsMade}/${job.opts.attempts}: ${err.message}`,
        );
      } else {
        console.log("Failed job without job object:", err.message);
      }
    });

    this.worker.on("completed", (job) => {
      console.log(`Job ${job.id} completed`);
    });
  }

  addToQueue(data: any) {
    return this.queue.add(`${this.queue_name}-job`, data, {
      removeOnComplete: true,
      removeOnFail: true,
      attempts: 2,
      backoff: {
        type: "fixed",
        delay: 1000,
      },
    });
  }

  async getJobProgress(job_id: string) {
    const job = await this.queue.getJob(job_id);
    console.log(job?.progress);
    if (!job) return null;
    return job.progress;
  }
}

const bullMqService = new BullMQService("video-processing");

export { bullMqService };
