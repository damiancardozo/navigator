import { describe, expect, it } from "vitest";
import type { BrowserAdapter, ImageExtraction, LinkExtraction } from "../src/index.js";
import { WorkflowRunner } from "../src/index.js";

class FakeBrowserAdapter implements BrowserAdapter {
  readonly calls: string[] = [];

  async ensureReady(): Promise<void> {
    this.calls.push("ensureReady");
  }

  async goto(url: string): Promise<void> {
    this.calls.push(`goto:${url}`);
  }

  async wait(): Promise<void> {
    this.calls.push("wait");
  }

  async waitForSelector(selector: string): Promise<void> {
    this.calls.push(`waitForSelector:${selector}`);
  }

  async click(selector: string): Promise<void> {
    this.calls.push(`click:${selector}`);
  }

  async type(selector: string, text: string): Promise<void> {
    this.calls.push(`type:${selector}:${text}`);
  }

  async scroll(): Promise<void> {
    this.calls.push("scroll");
  }

  async evaluate<T = unknown>(): Promise<T> {
    return "evaluated" as T;
  }

  async extractHtml(): Promise<string> {
    return "<html></html>";
  }

  async extractText(): Promise<string> {
    return "text";
  }

  async extractAttribute(): Promise<string | null> {
    return "attribute";
  }

  async extractAttributes(): Promise<Record<string, string | null>> {
    return { href: "/path" };
  }

  async extractImages(): Promise<ImageExtraction[]> {
    return [{ src: "image.png", alt: null, width: 10, height: 20 }];
  }

  async extractLinks(): Promise<LinkExtraction[]> {
    return [{ href: "https://example.com", text: "Example", title: null }];
  }

  async exists(): Promise<boolean> {
    return true;
  }

  async count(): Promise<number> {
    return 2;
  }

  async closeTab(): Promise<void> {
    this.calls.push("closeTab");
  }
}

describe("WorkflowRunner", () => {
  it("runs browser steps and returns only named outputs", async () => {
    const browser = new FakeBrowserAdapter();
    const runner = new WorkflowRunner(browser);

    const result = await runner.run({
      steps: [
        { action: "goto", url: "https://example.com" },
        { action: "waitForSelector", selector: "h1" },
        { action: "extractText", selector: "h1", output: "title" },
        { action: "extractLinks", output: "links" },
        { action: "exists", selector: ".cta" },
        { action: "closeTab" }
      ]
    });

    expect(browser.calls).toEqual([
      "ensureReady",
      "goto:https://example.com",
      "waitForSelector:h1",
      "closeTab"
    ]);
    expect(result).toEqual({
      title: "text",
      links: [{ href: "https://example.com", text: "Example", title: null }]
    });
  });
});
