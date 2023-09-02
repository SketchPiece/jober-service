import kv from "../kv.js";
import { syncCryptoWallet } from "./sync-crypto-wallet.job.js";

const NODE_ENV = process.env.NODE_ENV || "development";

const jobs = {
  "sync-crypto-wallet": syncCryptoWallet,
} as const;

type JobNames = keyof typeof jobs;

export interface JobStatus {
  status: "ok" | "error";
  error?: string;
  timestamp: number;
}

export const prefix =
  NODE_ENV === "production" ? "prod" : NODE_ENV === "test" ? "test" : "dev";

const jober = {
  runJob: async (jobName: JobNames): Promise<boolean> => {
    try {
      await jobs[jobName].handler();
      await kv.set(`${prefix}:${jobName}`, {
        status: "ok",
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      await kv.set(`${prefix}:${jobName}`, {
        status: "error",
        error: (error as Error).message,
        timestamp: Date.now(),
      });
      console.error(error);
      return false;
    }
  },
  getJobInfo: (jobName: JobNames) => {
    return jobs[jobName];
  },
  getJobNames: () => {
    return Object.keys(jobs) as JobNames[];
  },
  hasJob: (jobName: string): jobName is JobNames => {
    return jobName in jobs;
  },
};

export default jober;
