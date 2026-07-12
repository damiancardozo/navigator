import type { Workflow, WorkflowResult } from "@navigator/core";

export type JobStatus = "queued" | "running" | "completed" | "failed" | "waiting_for_human";

export interface NavigatorClientOptions {
  baseUrl: string;
  fetchImplementation?: typeof fetch;
}

export interface CreateJobResponse {
  jobId: string;
  status: "queued";
}

export interface JobResponse {
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

export interface HealthResponse {
  status: "ok";
  queue: {
    queued: number;
    running: number;
    completed: number;
    failed: number;
    waitingForHuman: number;
  };
}

export class NavigatorClient {
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: NavigatorClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async createJob(workflow: Workflow): Promise<CreateJobResponse> {
    return this.request<CreateJobResponse>("/jobs", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(workflow)
    });
  }

  async getJob(jobId: string): Promise<JobResponse> {
    return this.request<JobResponse>(`/jobs/${encodeURIComponent(jobId)}`);
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health");
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchImplementation(`${this.baseUrl}${path}`, init);
    const body = await response.json().catch(() => undefined);

    if (!response.ok) {
      const message =
        body && typeof body === "object" && "error" in body ? String(body.error) : response.statusText;
      throw new NavigatorClientError(message, response.status, body);
    }

    return body as T;
  }
}

export class NavigatorClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown
  ) {
    super(message);
    this.name = "NavigatorClientError";
  }
}
