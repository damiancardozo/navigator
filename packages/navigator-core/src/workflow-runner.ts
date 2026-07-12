import type { BrowserAdapter } from "./browser-adapter.js";
import { WorkflowValidationError } from "./errors.js";
import type { NavigatorLogger } from "./logger.js";
import { noopLogger } from "./logger.js";
import type {
  CountStep,
  EvaluateStep,
  ExistsStep,
  ExtractAttributeStep,
  ExtractAttributesStep,
  ExtractHtmlStep,
  ExtractImagesStep,
  ExtractLinksStep,
  ExtractTextStep,
  Workflow,
  WorkflowResult,
  WorkflowStep
} from "./workflow-types.js";

export interface WorkflowRunnerOptions {
  logger?: NavigatorLogger;
}

export class WorkflowRunner {
  private readonly logger: NavigatorLogger;

  constructor(private readonly browser: BrowserAdapter, options: WorkflowRunnerOptions = {}) {
    this.logger = options.logger ?? noopLogger;
  }

  async run(workflow: Workflow): Promise<WorkflowResult> {
    validateWorkflow(workflow);
    const startedAt = Date.now();
    const result: WorkflowResult = {};

    this.logger.info("workflow_started", { steps: workflow.steps.length });
    await this.browser.ensureReady();

    for (const [index, step] of workflow.steps.entries()) {
      const stepStartedAt = Date.now();
      this.logger.info("workflow_step_started", { index, action: step.action });
      await this.runStep(step, result);
      this.logger.info("workflow_step_completed", {
        index,
        action: step.action,
        durationMs: Date.now() - stepStartedAt
      });
    }

    this.logger.info("workflow_completed", { durationMs: Date.now() - startedAt });
    return result;
  }

  private async runStep(step: WorkflowStep, result: WorkflowResult): Promise<void> {
    switch (step.action) {
      case "goto":
        await this.browser.goto(step.url, { timeoutMs: step.timeoutMs });
        break;
      case "wait":
        await this.browser.wait({ durationMs: step.durationMs, timeoutMs: step.timeoutMs });
        break;
      case "waitForSelector":
        await this.browser.waitForSelector(step.selector, { timeoutMs: step.timeoutMs });
        break;
      case "click":
        await this.browser.click(step.selector, { timeoutMs: step.timeoutMs });
        break;
      case "type":
        await this.browser.type(step.selector, step.text, {
          clear: step.clear,
          timeoutMs: step.timeoutMs
        });
        break;
      case "scroll":
        await this.browser.scroll({
          selector: step.selector,
          x: step.x,
          y: step.y,
          timeoutMs: step.timeoutMs
        });
        break;
      case "evaluate":
        await assignOutput(result, step, () => this.browser.evaluate(step.script, { timeoutMs: step.timeoutMs }));
        break;
      case "extractHtml":
        await assignOutput(result, step, () => this.browser.extractHtml(step.selector));
        break;
      case "extractText":
        await assignOutput(result, step, () => this.browser.extractText(step.selector));
        break;
      case "extractAttribute":
        await assignOutput(result, step, () => this.browser.extractAttribute(step.selector, step.attribute));
        break;
      case "extractAttributes":
        await assignOutput(result, step, () => this.browser.extractAttributes(step.selector, step.attributes));
        break;
      case "extractImages":
        await assignOutput(result, step, () => this.browser.extractImages(step.selector));
        break;
      case "extractLinks":
        await assignOutput(result, step, () => this.browser.extractLinks(step.selector));
        break;
      case "exists":
        await assignOutput(result, step, () => this.browser.exists(step.selector));
        break;
      case "count":
        await assignOutput(result, step, () => this.browser.count(step.selector));
        break;
      case "sleep":
        await sleep(step.durationMs);
        break;
      case "closeTab":
        await this.browser.closeTab();
        break;
      default: {
        const unknownStep = step as WorkflowStep;
        throw new WorkflowValidationError(`Unsupported action: ${unknownStep.action}`);
      }
    }
  }
}

type ProducingStep =
  | EvaluateStep
  | ExtractHtmlStep
  | ExtractTextStep
  | ExtractAttributeStep
  | ExtractAttributesStep
  | ExtractImagesStep
  | ExtractLinksStep
  | ExistsStep
  | CountStep;

async function assignOutput(
  result: WorkflowResult,
  step: ProducingStep,
  producer: () => Promise<unknown>
): Promise<void> {
  const value = await producer();
  if (step.output) {
    result[step.output] = value;
  }
}

function validateWorkflow(workflow: Workflow): void {
  if (!workflow || !Array.isArray(workflow.steps)) {
    throw new WorkflowValidationError("Workflow must contain a steps array.");
  }

  if (workflow.steps.length === 0) {
    throw new WorkflowValidationError("Workflow must contain at least one step.");
  }
}

function sleep(durationMs: number): Promise<void> {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new WorkflowValidationError("sleep.durationMs must be a non-negative number.");
  }

  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
