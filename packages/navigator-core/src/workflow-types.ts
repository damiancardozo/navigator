export interface Workflow {
  steps: WorkflowStep[];
}

export type WorkflowResult = Record<string, unknown>;

export type WorkflowStep =
  | GotoStep
  | WaitStep
  | WaitForSelectorStep
  | ClickStep
  | TypeStep
  | ScrollStep
  | EvaluateStep
  | ExtractHtmlStep
  | ExtractTextStep
  | ExtractAttributeStep
  | ExtractAttributesStep
  | ExtractImagesStep
  | ExtractLinksStep
  | ExistsStep
  | CountStep
  | SleepStep
  | CloseTabStep;

export interface BaseStep {
  action: string;
  timeoutMs?: number;
}

export interface OutputStep extends BaseStep {
  output?: string;
}

export interface SelectorStep extends BaseStep {
  selector: string;
}

export interface GotoStep extends BaseStep {
  action: "goto";
  url: string;
}

export interface WaitStep extends BaseStep {
  action: "wait";
  durationMs?: number;
}

export interface WaitForSelectorStep extends SelectorStep {
  action: "waitForSelector";
}

export interface ClickStep extends SelectorStep {
  action: "click";
}

export interface TypeStep extends SelectorStep {
  action: "type";
  text: string;
  clear?: boolean;
}

export interface ScrollStep extends BaseStep {
  action: "scroll";
  selector?: string;
  x?: number;
  y?: number;
}

export interface EvaluateStep extends OutputStep {
  action: "evaluate";
  script: string;
}

export interface ExtractHtmlStep extends OutputStep {
  action: "extractHtml";
  selector?: string;
}

export interface ExtractTextStep extends OutputStep {
  action: "extractText";
  selector?: string;
}

export interface ExtractAttributeStep extends OutputStep, SelectorStep {
  action: "extractAttribute";
  attribute: string;
}

export interface ExtractAttributesStep extends OutputStep, SelectorStep {
  action: "extractAttributes";
  attributes?: string[];
}

export interface ExtractImagesStep extends OutputStep {
  action: "extractImages";
  selector?: string;
}

export interface ExtractLinksStep extends OutputStep {
  action: "extractLinks";
  selector?: string;
}

export interface ExistsStep extends OutputStep, SelectorStep {
  action: "exists";
}

export interface CountStep extends OutputStep, SelectorStep {
  action: "count";
}

export interface SleepStep extends BaseStep {
  action: "sleep";
  durationMs: number;
}

export interface CloseTabStep extends BaseStep {
  action: "closeTab";
}

export interface ImageExtraction {
  src: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
}

export interface LinkExtraction {
  href: string | null;
  text: string;
  title: string | null;
}
