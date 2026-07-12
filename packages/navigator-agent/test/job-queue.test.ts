import { describe, expect, it } from "vitest";
import type { BrowserAdapter, ImageExtraction, LinkExtraction } from "@navigator/core";
import { JobQueue } from "../src/index.js";

class SlowFakeBrowserAdapter implements BrowserAdapter {
  readonly order: string[] = [];

  async ensureReady(): Promise<void> {
    return;
  }

  async goto(url: string): Promise<void> {
    this.order.push(url);
    await new Promise((resolve) => setTimeout(resolve, 5));
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

describe("JobQueue", () => {
  it("executes jobs FIFO with one active workflow", async () => {
    const browser = new SlowFakeBrowserAdapter();
    const queue = new JobQueue({ browser });

    const first = queue.enqueue({ steps: [{ action: "goto", url: "first" }] });
    const second = queue.enqueue({ steps: [{ action: "goto", url: "second" }] });

    await waitFor(() => queue.get(second.jobId)?.status === "completed");

    expect(queue.get(first.jobId)?.status).toBe("completed");
    expect(queue.get(second.jobId)?.status).toBe("completed");
    expect(browser.order).toEqual(["first", "second"]);
  });
});

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for predicate.");
}
