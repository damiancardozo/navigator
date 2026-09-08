import type { WorkflowResult } from "./workflow-types.js";

export class WorkflowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowValidationError";
  }
}

export class HumanInterventionRequiredError extends Error {
  readonly reason: string;
  result?: WorkflowResult;

  constructor(reason: string, result?: WorkflowResult) {
    super(reason);
    this.name = "HumanInterventionRequiredError";
    this.reason = reason;
    this.result = result;
  }
}

export class WorkflowExecutionError extends Error {
  readonly result: WorkflowResult;

  constructor(message: string, result: WorkflowResult, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "WorkflowExecutionError";
    this.result = result;
  }
}
