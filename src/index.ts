import jober from "./lib/jober/index.js";
import { CronJob } from "cron";

async function everyDayAtMidnight() {
  const jobName = "sync-crypto-wallet";
  console.log("Running job: ", jobName);

  const result = await jober.runJob("sync-crypto-wallet");

  if (!result) {
    return console.log(`Job ${jobName} failed`);
  }

  console.log(`Job ${jobName} completed`);
}

const job = new CronJob(`0 0 * * *`, everyDayAtMidnight);

job.start();
console.log("Jober started");
