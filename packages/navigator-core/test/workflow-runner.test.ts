import { describe, expect, it } from "vitest";
import type { BrowserAdapter, ImageExtraction, LinkExtraction } from "../src/index.js";
import { HumanInterventionRequiredError, WorkflowRunner } from "../src/index.js";

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

  it("captures the current page when a selector wait needs a human", async () => {
    class MissingSelectorBrowser extends FakeBrowserAdapter {
      async waitForSelector(selector: string): Promise<void> {
        this.calls.push(`waitForSelector:${selector}`);
        throw new HumanInterventionRequiredError(`Selector "${selector}" did not appear. Human intervention may be required.`);
      }

      async evaluate<T = unknown>(): Promise<T> {
        return {
          url: "https://example.com/blocked",
          title: "Too Many Requests",
          html: "<html><body>Too Many Requests</body></html>",
          text: "Too Many Requests"
        } as T;
      }
    }

    const browser = new MissingSelectorBrowser();
    const runner = new WorkflowRunner(browser);

    await expect(
      runner.run({
        steps: [
          { action: "goto", url: "https://example.com" },
          { action: "waitForSelector", selector: "#form" }
        ]
      })
    ).rejects.toMatchObject({
      name: "HumanInterventionRequiredError",
      result: {
        pageOnError: {
          url: "https://example.com/blocked",
          title: "Too Many Requests",
          html: "<html><body>Too Many Requests</body></html>",
          text: "Too Many Requests"
        }
      }
    });
  });

  it("captures the current page when a step fails", async () => {
    class FailingClickBrowser extends FakeBrowserAdapter {
      async click(selector: string): Promise<void> {
        this.calls.push(`click:${selector}`);
        throw new Error("Element not found");
      }

      async evaluate<T = unknown>(): Promise<T> {
        return {
          url: "https://example.com/error",
          title: "Error",
          html: "<html><body>Error</body></html>",
          text: "Error"
        } as T;
      }
    }

    const browser = new FailingClickBrowser();
    const runner = new WorkflowRunner(browser);

    await expect(
      runner.run({
        steps: [
          { action: "goto", url: "https://example.com" },
          { action: "click", selector: "#next" }
        ]
      })
    ).rejects.toMatchObject({
      name: "WorkflowExecutionError",
      message: "Element not found",
      result: {
        pageOnError: {
          url: "https://example.com/error",
          html: "<html><body>Error</body></html>",
          text: "Error"
        }
      }
    });
  });
});
