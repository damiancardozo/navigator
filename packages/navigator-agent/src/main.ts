import { CdpBrowserAdapter } from "@navigator/cdp";
import { JobQueue } from "./job-queue.js";
import { createConsoleLogger } from "./logger.js";
import { createServer } from "./server.js";

const logger = createConsoleLogger();
const browser = new CdpBrowserAdapter({
  chromePath: process.env.NAVIGATOR_CHROME_PATH,
  remoteDebuggingPort: process.env.NAVIGATOR_CDP_PORT ? Number(process.env.NAVIGATOR_CDP_PORT) : undefined,
  userDataDir: process.env.NAVIGATOR_CHROME_PROFILE_DIR
});

const queue = new JobQueue({ browser, logger });
const server = createServer({ queue });
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await server.listen({ port, host });
  logger.info("navigator_agent_started", { host, port });
} catch (error) {
  logger.error("navigator_agent_start_failed", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}
