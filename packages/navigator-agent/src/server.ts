import Fastify, { type FastifyInstance } from "fastify";
import type { Workflow } from "@navigator/core";
import { WorkflowValidationError } from "@navigator/core";
import { JobQueue } from "./job-queue.js";

export interface CreateServerOptions {
  queue: JobQueue;
  logger?: boolean;
}

export function createServer(options: CreateServerOptions): FastifyInstance {
  const server = Fastify({ logger: options.logger ?? true });

  server.get("/health", async () => ({
    status: "ok",
    queue: options.queue.stats()
  }));

  server.post<{ Body: Workflow }>("/jobs", async (request, reply) => {
    const workflow = request.body;

    try {
      validateWorkflowPayload(workflow);
      const job = options.queue.enqueue(workflow);
      return reply.code(202).send({
        jobId: job.jobId,
        status: job.status
      });
    } catch (error) {
      if (error instanceof WorkflowValidationError) {
        return reply.code(400).send({
          error: error.message
        });
      }

      throw error;
    }
  });

  server.get<{ Params: { id: string } }>("/jobs/:id", async (request, reply) => {
    const job = options.queue.get(request.params.id);
    if (!job) {
      return reply.code(404).send({ error: "Job not found." });
    }

    return job;
  });

  return server;
}

function validateWorkflowPayload(workflow: Workflow): void {
  if (!workflow || !Array.isArray(workflow.steps)) {
    throw new WorkflowValidationError("Workflow must contain a steps array.");
  }

  if (workflow.steps.length === 0) {
    throw new WorkflowValidationError("Workflow must contain at least one step.");
  }
}
