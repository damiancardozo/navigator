import type { NavigatorLogger } from "@navigator/core";

export function createConsoleLogger(): NavigatorLogger {
  return {
    info: (message, meta) => console.info(format(message, meta)),
    warn: (message, meta) => console.warn(format(message, meta)),
    error: (message, meta) => console.error(format(message, meta)),
    debug: (message, meta) => console.debug(format(message, meta))
  };
}

function format(message: string, meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) {
    return message;
  }

  return `${message} ${JSON.stringify(meta)}`;
}
