import { Job, Queue, Worker } from "bullmq";
import generateHLSOutput from "./ffmpeg.js";
import { websocketService } from "./ws.js";

export default class BullMQService {
  private queue: Queue;
  private worker: Worker;
  readonly queue_name: string;
  constructor(queue_name: string) {
    console.log(`Bullmq Service ${queue_name} is active`);
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
      },
      {
        connection,
        concurrency: 4,
      },
    );

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

  async getJobProgress(job_id: string, client_id: number) {
    const socket = websocketService.getSocket(client_id);
    if (!socket) {
      console.warn(`No socket found for client_id: ${client_id}`);
      return;
    }

    const progressHandler = (job: Job, progress: any) => {
      if (job_id === job.id && socket) {
        console.log(`Job ${job.id} progress: ${progress}%`);
        websocketService.sendMessage(socket, {
          type: "message",
          payload: { progress },
        });
      }
    };

    const cleanup = () => {
      this.worker.off("progress", progressHandler);
      this.worker.off("completed", completedHandler);
      this.worker.off("failed", failedHandler);
      socket?.off("close", cleanup);
    };

    const completedHandler = (job: Job) => {
      if (job.id === job_id) {
        cleanup();
      }
    };

    const failedHandler = (job: Job | undefined) => {
      if (job?.id === job_id) {
        cleanup();
      }
    };

    const job = await this.queue.getJob(job_id);
    if (!job) {
      console.log("error: job not found");
      websocketService.sendMessage(socket, {
        type: "error",
        payload: { message: `Job ${job_id} not found` },
      });
      return;
    }
    this.worker.on("progress", progressHandler);
    this.worker.on("completed", completedHandler);
    this.worker.on("failed", failedHandler);
    socket?.on("close", cleanup);

    const currentProgress = job.progress;
    websocketService.sendMessage(socket, {
      type: "message",
      payload: { progress: currentProgress },
    });
  }
}

const bullMqService = new BullMQService("video-processing");
const deadQueueService = new BullMQService("failed-videos");
export { bullMqService };
