import { randomUUID } from "node:crypto";
import {
  HumanInterventionRequiredError,
  type BrowserAdapter,
  type NavigatorLogger,
  type Workflow,
  WorkflowRunner
} from "@navigator/core";
import { noopLogger } from "@navigator/core";
import type { JobPublicView, JobRecord } from "./job-types.js";

export interface JobQueueOptions {
  browser: BrowserAdapter;
  logger?: NavigatorLogger;
}

export class JobQueue {
  private readonly jobs = new Map<string, JobRecord>();
  private readonly pending: string[] = [];
  private readonly runner: WorkflowRunner;
  private readonly logger: NavigatorLogger;
  private processing = false;

  constructor(options: JobQueueOptions) {
    this.logger = options.logger ?? noopLogger;
    this.runner = new WorkflowRunner(options.browser, { logger: this.logger });
  }

  enqueue(workflow: Workflow): JobPublicView {
    const now = new Date().toISOString();
    const id = randomUUID();
    const job: JobRecord = {
      id,
      workflow,
      status: "queued",
      createdAt: now,
      updatedAt: now
    };

    this.jobs.set(id, job);
    this.pending.push(id);
    this.logger.info("job_queued", { jobId: id });
    const publicView = toPublicView(job);
    setImmediate(() => void this.processNext());

    return publicView;
  }

  get(id: string): JobPublicView | undefined {
    const job = this.jobs.get(id);
    return job ? toPublicView(job) : undefined;
  }

  stats(): { queued: number; running: number; completed: number; failed: number; waitingForHuman: number } {
    let running = 0;
    let completed = 0;
    let failed = 0;
    let waitingForHuman = 0;

    for (const job of this.jobs.values()) {
      if (job.status === "running") running += 1;
      if (job.status === "completed") completed += 1;
      if (job.status === "failed") failed += 1;
      if (job.status === "waiting_for_human") waitingForHuman += 1;
    }

    return {
      queued: this.pending.length,
      running,
      completed,
      failed,
      waitingForHuman
    };
  }

  private async processNext(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (this.pending.length > 0) {
        const id = this.pending.shift();
        if (!id) {
          continue;
        }

        const job = this.jobs.get(id);
        if (!job) {
          continue;
        }

        await this.runJob(job);
      }
    } finally {
      this.processing = false;
    }
  }

  private async runJob(job: JobRecord): Promise<void> {
    const startedAt = Date.now();
    const startedAtIso = new Date(startedAt).toISOString();
    Object.assign(job, {
      status: "running",
      startedAt: startedAtIso,
      updatedAt: startedAtIso
    });

    this.logger.info("job_started", { jobId: job.id });

    try {
      const result = await this.runner.run(job.workflow);
      const completedAt = Date.now();
      Object.assign(job, {
        status: "completed",
        result,
        completedAt: new Date(completedAt).toISOString(),
        updatedAt: new Date(completedAt).toISOString(),
        durationMs: completedAt - startedAt
      });
      this.logger.info("job_completed", { jobId: job.id, durationMs: job.durationMs });
    } catch (error) {
      const completedAt = Date.now();
      if (error instanceof HumanInterventionRequiredError) {
        Object.assign(job, {
          status: "waiting_for_human",
          humanReason: error.reason,
          completedAt: new Date(completedAt).toISOString(),
          updatedAt: new Date(completedAt).toISOString(),
          durationMs: completedAt - startedAt
        });
        this.logger.warn("job_waiting_for_human", { jobId: job.id, reason: error.reason });
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      Object.assign(job, {
        status: "failed",
        error: message,
        completedAt: new Date(completedAt).toISOString(),
        updatedAt: new Date(completedAt).toISOString(),
        durationMs: completedAt - startedAt
      });
      this.logger.error("job_failed", { jobId: job.id, error: message });
    }
  }
}

function toPublicView(job: JobRecord): JobPublicView {
  return {
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    durationMs: job.durationMs,
    result: job.result,
    error: job.error,
    humanReason: job.humanReason
  };
}
