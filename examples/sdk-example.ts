import { NavigatorClient } from "@navigator/sdk";
import workflow from "./workflow.example.json" with { type: "json" };

const client = new NavigatorClient({
  baseUrl: process.env.NAVIGATOR_URL ?? "http://localhost:3001"
});

const created = await client.createJob(workflow);
console.log("queued", created);

let current = await client.getJob(created.jobId);
while (current.status === "queued" || current.status === "running") {
  await new Promise((resolve) => setTimeout(resolve, 500));
  current = await client.getJob(created.jobId);
}

console.log(JSON.stringify(current, null, 2));
