import type {
  BrowserAdapter,
  ImageExtraction,
  LinkExtraction,
  ScrollOptions,
  StepTimeoutOptions,
  TypeOptions,
  WaitOptions
} from "@navigator/core";
import { HumanInterventionRequiredError } from "@navigator/core";
import CDP from "chrome-remote-interface";
import { ChromeProcessManager, type ChromeProcessManagerOptions } from "./chrome-process-manager.js";

export interface CdpBrowserAdapterOptions extends ChromeProcessManagerOptions {
  defaultTimeoutMs?: number;
}

interface RuntimeCallResult {
  result?: { value?: unknown; objectId?: string; subtype?: string; description?: string };
  exceptionDetails?: { text?: string; exception?: { description?: string; value?: unknown } };
}

export class CdpBrowserAdapter implements BrowserAdapter {
  private readonly manager: ChromeProcessManager;
  private readonly defaultTimeoutMs: number;
  private client?: any;
  private target?: any;

  constructor(options: CdpBrowserAdapterOptions = {}) {
    this.manager = new ChromeProcessManager(options);
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30_000;
  }

  async ensureReady(): Promise<void> {
    await this.manager.ensureRunning();

    if (this.client) {
      try {
        await this.client.Runtime.evaluate({ expression: "1" });
        return;
      } catch {
        this.client = undefined;
        this.target = undefined;
      }
    }

    this.target = await CDP.New({ ...this.manager.endpoint(), url: "about:blank" });
    this.client = await CDP({ ...this.manager.endpoint(), target: this.target });
    await Promise.all([
      this.client.Page.enable(),
      this.client.DOM.enable(),
      this.client.Runtime.enable()
    ]);
  }

  async goto(url: string, options: StepTimeoutOptions = {}): Promise<void> {
    const client = await this.readyClient();
    const timeoutMs = this.timeout(options);
    const loadPromise = client.Page.loadEventFired();
    await client.Page.navigate({ url });
    await withTimeout(loadPromise, timeoutMs, `Navigation to ${url} did not finish automatically.`);
  }

  async wait(options: WaitOptions = {}): Promise<void> {
    if (options.durationMs && options.durationMs > 0) {
      await delay(options.durationMs);
      return;
    }

    const client = await this.readyClient();
    await withTimeout(client.Page.loadEventFired(), this.timeout(options), "Page did not finish loading automatically.");
  }

  async waitForSelector(selector: string, options: StepTimeoutOptions = {}): Promise<void> {
    await this.pollUntil(
      `document.querySelector(${js(selector)}) !== null`,
      options,
      `Selector "${selector}" did not appear. Human intervention may be required.`
    );
  }

  async click(selector: string, options: StepTimeoutOptions = {}): Promise<void> {
    await this.waitForSelector(selector, options);
    await this.evaluateVoid(
      `
        (() => {
          const element = document.querySelector(${js(selector)});
          if (!element) throw new Error("Element not found");
          element.scrollIntoView({ block: "center", inline: "center" });
          element.click();
        })()
      `,
      options
    );
  }

  async type(selector: string, text: string, options: TypeOptions = {}): Promise<void> {
    await this.waitForSelector(selector, options);
    await this.evaluateVoid(
      `
        (() => {
          const element = document.querySelector(${js(selector)});
          if (!element) throw new Error("Element not found");
          element.focus();
          if (${options.clear ? "true" : "false"}) {
            element.value = "";
          }
        })()
      `,
      options
    );

    const client = await this.readyClient();
    for (const character of text) {
      await client.Input.dispatchKeyEvent({
        type: "char",
        text: character,
        unmodifiedText: character
      });
    }
  }

  async scroll(options: ScrollOptions = {}): Promise<void> {
    const x = options.x ?? 0;
    const y = options.y ?? 0;

    await this.evaluateVoid(
      options.selector
        ? `
          (() => {
            const element = document.querySelector(${js(options.selector)});
            if (!element) throw new Error("Element not found");
            element.scrollBy(${Number(x)}, ${Number(y)});
          })()
        `
        : `window.scrollBy(${Number(x)}, ${Number(y)})`,
      options
    );
  }

  async evaluate<T = unknown>(script: string, options: StepTimeoutOptions = {}): Promise<T> {
    const result = await this.evaluateExpression(script, options);
    return result as T;
  }

  async extractHtml(selector?: string): Promise<string> {
    return this.evaluate<string>(
      selector
        ? `
          (() => {
            const element = document.querySelector(${js(selector)});
            return element ? element.outerHTML : "";
          })()
        `
        : "document.documentElement.outerHTML"
    );
  }

  async extractText(selector?: string): Promise<string> {
    return this.evaluate<string>(
      selector
        ? `
          (() => {
            const element = document.querySelector(${js(selector)});
            return element ? element.textContent ?? "" : "";
          })()
        `
        : "document.body ? document.body.innerText : document.documentElement.textContent ?? \"\""
    );
  }

  async extractAttribute(selector: string, attribute: string): Promise<string | null> {
    return this.evaluate<string | null>(
      `
        (() => {
          const element = document.querySelector(${js(selector)});
          return element ? element.getAttribute(${js(attribute)}) : null;
        })()
      `
    );
  }

  async extractAttributes(selector: string, attributes?: string[]): Promise<Record<string, string | null>> {
    return this.evaluate<Record<string, string | null>>(
      `
        (() => {
          const element = document.querySelector(${js(selector)});
          if (!element) return {};
          const requested = ${attributes ? js(attributes) : "Array.from(element.getAttributeNames())"};
          return Object.fromEntries(requested.map((name) => [name, element.getAttribute(name)]));
        })()
      `
    );
  }

  async extractImages(selector?: string): Promise<ImageExtraction[]> {
    return this.evaluate<ImageExtraction[]>(
      `
        (() => {
          const root = ${selector ? `document.querySelector(${js(selector)})` : "document"};
          if (!root) return [];
          return Array.from(root.querySelectorAll("img")).map((image) => ({
            src: image.currentSrc || image.src || null,
            alt: image.getAttribute("alt"),
            width: image.naturalWidth || image.width || null,
            height: image.naturalHeight || image.height || null
          }));
        })()
      `
    );
  }

  async extractLinks(selector?: string): Promise<LinkExtraction[]> {
    return this.evaluate<LinkExtraction[]>(
      `
        (() => {
          const root = ${selector ? `document.querySelector(${js(selector)})` : "document"};
          if (!root) return [];
          return Array.from(root.querySelectorAll("a")).map((link) => ({
            href: link.href || link.getAttribute("href"),
            text: (link.innerText || link.textContent || "").trim(),
            title: link.getAttribute("title")
          }));
        })()
      `
    );
  }

  async exists(selector: string): Promise<boolean> {
    return this.evaluate<boolean>(`document.querySelector(${js(selector)}) !== null`);
  }

  async count(selector: string): Promise<number> {
    return this.evaluate<number>(`document.querySelectorAll(${js(selector)}).length`);
  }

  async closeTab(): Promise<void> {
    if (!this.client || !this.target) {
      return;
    }

    const target = this.target;
    await this.client.close();
    await CDP.Close({ ...this.manager.endpoint(), id: target.id });
    this.client = undefined;
    this.target = undefined;
  }

  private async readyClient(): Promise<any> {
    await this.ensureReady();
    return this.client;
  }

  private timeout(options: StepTimeoutOptions = {}): number {
    return options.timeoutMs ?? this.defaultTimeoutMs;
  }

  private async pollUntil(expression: string, options: StepTimeoutOptions, reason: string): Promise<void> {
    const timeoutMs = this.timeout(options);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const found = await this.evaluate<boolean>(expression, { timeoutMs: Math.min(1_000, timeoutMs) });
      if (found) {
        return;
      }
      await delay(250);
    }

    throw new HumanInterventionRequiredError(reason);
  }

  private async evaluateVoid(script: string, options: StepTimeoutOptions): Promise<void> {
    await this.evaluateExpression(script, options);
  }

  private async evaluateExpression(script: string, options: StepTimeoutOptions = {}): Promise<unknown> {
    const client = await this.readyClient();
    const call = client.Runtime.evaluate({
      expression: script,
      awaitPromise: true,
      returnByValue: true
    }) as Promise<RuntimeCallResult>;

    const response = await withTimeout(call, this.timeout(options), "Script evaluation did not finish automatically.");
    if (response.exceptionDetails) {
      const description =
        response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text ??
        "Evaluation failed.";
      throw new Error(description);
    }

    return response.result?.value;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, reason: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new HumanInterventionRequiredError(reason)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function js(value: unknown): string {
  return JSON.stringify(value);
}
