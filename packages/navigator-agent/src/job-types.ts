import type { Workflow, WorkflowResult } from "@navigator/core";

export type JobStatus = "queued" | "running" | "completed" | "failed" | "waiting_for_human";

export interface JobRecord {
  id: string;
  workflow: Workflow;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  result?: WorkflowResult;
  error?: string;
  humanReason?: string;
}

export interface JobPublicView {
  jobId: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  result?: WorkflowResult;
  error?: string;
  humanReason?: string;
}
