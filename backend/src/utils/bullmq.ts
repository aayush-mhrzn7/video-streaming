import { Job, Queue, Worker } from "bullmq";
import generateHLSOutput from "./ffmpeg.js";
import { websocketService } from "./ws.js";

export default class BullMQService {
  private queue: Queue;
  private worker: Worker;
  private dlqQueue: Queue;
  private dlqWorker: Worker;
  readonly queue_name: string;
  readonly dlq_queue_name: string;

  constructor(queue_name: string, dlq_queue_name: string) {
    console.log(`BullMQ Service ${queue_name} is active`);
    const connection = { host: "localhost", port: 6379 };
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
      { connection, concurrency: 2 },
    );
    this.dlqWorker = new Worker(
      dlq_queue_name,
      async (job: Job) => {
        console.log(
          `DLQ processing job ${job.id}... attempt ${job.attemptsMade}`,
        );
        const { data } = job.data;
        console.log(data.file_location);
        await generateHLSOutput({
          input_path: data.file_location,
          onProgress: async (percent) => {
            job.updateProgress(percent);
          },
        });
      },
      { connection, concurrency: 1 },
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
  async getJobProgress(job_id: string, client_id: number) {
    const socket = websocketService.getSocket(client_id);
    if (!socket) {
      console.warn(`No socket found for client_id: ${client_id}`);
      return;
    }
    const progressHandler = (job: Job, progress: any) => {
      if (job_id === job.id && socket) {
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
      if (job.id === job_id) cleanup();
    };
    const failedHandler = (job: Job | undefined) => {
      if (job?.id === job_id) cleanup();
    };
    const job = await this.queue.getJob(job_id);
    if (!job) {
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
    websocketService.sendMessage(socket, {
      type: "message",
      payload: { progress: job.progress },
    });
  }
}

const bullMqService = new BullMQService("video-processing", "failed-videos");
export { bullMqService };
