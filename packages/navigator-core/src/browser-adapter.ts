import type { ImageExtraction, LinkExtraction } from "./workflow-types.js";

export interface BrowserAdapter {
  ensureReady(): Promise<void>;
  goto(url: string, options?: StepTimeoutOptions): Promise<void>;
  wait(options?: WaitOptions): Promise<void>;
  waitForSelector(selector: string, options?: StepTimeoutOptions): Promise<void>;
  click(selector: string, options?: StepTimeoutOptions): Promise<void>;
  type(selector: string, text: string, options?: TypeOptions): Promise<void>;
  scroll(options?: ScrollOptions): Promise<void>;
  evaluate<T = unknown>(script: string, options?: StepTimeoutOptions): Promise<T>;
  extractHtml(selector?: string): Promise<string>;
  extractText(selector?: string): Promise<string>;
  extractAttribute(selector: string, attribute: string): Promise<string | null>;
  extractAttributes(selector: string, attributes?: string[]): Promise<Record<string, string | null>>;
  extractImages(selector?: string): Promise<ImageExtraction[]>;
  extractLinks(selector?: string): Promise<LinkExtraction[]>;
  exists(selector: string): Promise<boolean>;
  count(selector: string): Promise<number>;
  closeTab(): Promise<void>;
}

export interface StepTimeoutOptions {
  timeoutMs?: number;
}

export interface WaitOptions extends StepTimeoutOptions {
  durationMs?: number;
}

export interface TypeOptions extends StepTimeoutOptions {
  clear?: boolean;
}

export interface ScrollOptions extends StepTimeoutOptions {
  selector?: string;
  x?: number;
  y?: number;
}
