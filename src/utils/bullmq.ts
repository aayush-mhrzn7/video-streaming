import { Job, Queue, Worker } from "bullmq";

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
        console.log("Received job:", job.data);
        if (job.data.shouldFail) {
          throw new Error("Failed");
        }

        for (let i = 0; i <= 100; i += 10) {
          await new Promise((r) => setTimeout(r, 200));
          job.updateProgress(i);
        }
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

  getJobProgress() {
    this.worker.on("progress", (job, progress) => {
      console.log(`Job ${job.id} progress: ${progress}%`);
    });
  }
}

const bullMqService = new BullMQService("video-processing");

export { bullMqService };
