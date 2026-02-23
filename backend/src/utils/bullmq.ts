import { Job, Queue, Worker } from "bullmq";
import generateHLSOutput from "./ffmpeg.js";
import { websocketService } from "./ws.js";

export default class BullMQService {
  private queue: Queue;
  private worker: Worker;
  private dlqQueue: Queue;
  private dlqWorker: Worker;
  private activeListeners: Set<string> = new Set();
  readonly queue_name: string;
  readonly dlq_queue_name: string;

  constructor(queue_name: string, dlq_queue_name: string) {
    console.log(`BullMQ Service ${queue_name} is active`);
    const connection = {
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT) || 6379,
    };
    this.queue_name = queue_name;
    this.dlq_queue_name = dlq_queue_name;
    this.queue = new Queue(queue_name, { connection });
    this.dlqQueue = new Queue(dlq_queue_name, { connection });

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
      { connection, concurrency: Number(process.env.WORKER_CONCURRENCY) || 2 },
    );

    this.dlqWorker = new Worker(
      dlq_queue_name,
      async (job: Job) => {
        console.log(
          `DLQ processing job ${job.id}... attempt ${job.attemptsMade}`,
        );
        const { data, originalJobId } = job.data;
        await generateHLSOutput({
          input_path: data.file_location,
          onProgress: async (percent) => {
            await job.updateProgress(percent);
            this.worker.emit("progress", { id: originalJobId } as any, percent);
          },
        });
      },
      { connection, concurrency: Number(process.env.DLQ_CONCURRENCY) || 1 },
    );

    this.worker.on("failed", async (job, err) => {
      if (!job) {
        console.log("Failed job without job object:", err.message);
        return;
      }
      console.log(
        `Job ${job.id} failed attempt ${job.attemptsMade}/${job.opts.attempts}: ${err.message}`,
      );
      if (job.attemptsMade >= (job.opts.attempts || 1)) {
        await this.dlqQueue.add(
          `dlq-${job.id}`,
          {
            originalJobId: job.id,
            data: job.data,
            failed_at: new Date().toISOString(),
            reason: err.message,
          },
          {
            attempts: 2,
            backoff: { type: "fixed", delay: 1000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
        console.log(`Job ${job.id} pushed to DLQ`);
      }
    });

    this.worker.on("completed", (job) => {
      console.log(`Job ${job.id} completed`);
    });

    this.dlqWorker.on("failed", (job, err) => {
      console.error(`DLQ job ${job?.id} failed: ${err.message}`);
    });

    this.dlqWorker.on("completed", (job) => {
      console.log(`DLQ job ${job.id} processed`);
    });
  }

  addToQueue(data: any) {
    return this.queue.add(`${this.queue_name}-job`, data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 1,
      backoff: { type: "fixed", delay: 1000 },
    });
  }

  async getJobs() {
    return await this.queue.getActive();
  }

  async getJobProgress(job_id: string, client_id: string) {
    if (this.activeListeners.has(job_id)) return;
    this.activeListeners.add(job_id);

    let socket: ReturnType<typeof websocketService.getSocket>;
    try {
      socket = websocketService.getSocket(client_id);
    } catch {
      console.warn(`No socket found for client_id: ${client_id}`);
      this.activeListeners.delete(job_id);
      return;
    }

    const job = await this.queue.getJob(job_id);
    if (!job) {
      websocketService.sendMessageById(client_id, {
        type: "error",
        payload: { message: `Job ${job_id} not found`, job_id },
      });
      this.activeListeners.delete(job_id);
      return;
    }

    const cleanup = () => {
      this.activeListeners.delete(job_id);
      this.worker.off("progress", progressHandler);
      this.worker.off("completed", completedHandler);
      this.worker.off("failed", failedHandler);
      socket.off("close", cleanup);
    };

    const progressHandler = (job: Job, progress: any) => {
      if (job.id !== job_id) return;
      websocketService.sendMessageById(client_id, {
        type: "message",
        payload: { progress, job_id: job.id },
      });
    };

    const completedHandler = (job: Job) => {
      if (job.id !== job_id) return;
      cleanup();
    };

    const failedHandler = (job: Job | undefined, err: Error) => {
      if (job?.id !== job_id) return;
      websocketService.sendMessageById(client_id, {
        type: "error",
        payload: { message: err.message, job_id },
      });
      cleanup();
    };

    this.worker.on("progress", progressHandler);
    this.worker.on("completed", completedHandler);
    this.worker.on("failed", failedHandler);
    socket.on("close", cleanup);

    websocketService.sendMessageById(client_id, {
      type: "message",
      payload: { progress: job.progress, job_id: job.id },
    });
  }
}

const bullMqService = new BullMQService("video-processing", "failed-videos");
export { bullMqService };
