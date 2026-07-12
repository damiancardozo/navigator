export class WorkflowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowValidationError";
  }
}

export class HumanInterventionRequiredError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = "HumanInterventionRequiredError";
    this.reason = reason;
  }
}
