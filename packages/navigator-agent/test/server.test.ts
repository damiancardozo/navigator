import { describe, expect, it } from "vitest";
import type { BrowserAdapter, ImageExtraction, LinkExtraction } from "@navigator/core";
import { JobQueue, createServer } from "../src/index.js";

class NoopBrowserAdapter implements BrowserAdapter {
  async ensureReady(): Promise<void> {
    return;
  }

  async goto(): Promise<void> {
    return;
  }

  async wait(): Promise<void> {
    return;
  }

  async waitForSelector(): Promise<void> {
    return;
  }

  async click(): Promise<void> {
    return;
  }

  async type(): Promise<void> {
    return;
  }

  async scroll(): Promise<void> {
    return;
  }

  async evaluate<T = unknown>(): Promise<T> {
    return undefined as T;
  }

  async extractHtml(): Promise<string> {
    return "";
  }

  async extractText(): Promise<string> {
    return "";
  }

  async extractAttribute(): Promise<string | null> {
    return null;
  }

  async extractAttributes(): Promise<Record<string, string | null>> {
    return {};
  }

  async extractImages(): Promise<ImageExtraction[]> {
    return [];
  }

  async extractLinks(): Promise<LinkExtraction[]> {
    return [];
  }

  async exists(): Promise<boolean> {
    return false;
  }

  async count(): Promise<number> {
    return 0;
  }

  async closeTab(): Promise<void> {
    return;
  }
}

describe("createServer", () => {
  it("serves health and accepts jobs", async () => {
    const queue = new JobQueue({ browser: new NoopBrowserAdapter() });
    const server = createServer({ queue, logger: false });

    const health = await server.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: "ok" });

    const created = await server.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        steps: [{ action: "goto", url: "https://example.com" }]
      }
    });

    expect(created.statusCode).toBe(202);
    expect(created.json()).toMatchObject({ status: "queued" });
  });
});
