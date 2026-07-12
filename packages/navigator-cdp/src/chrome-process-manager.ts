import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { platform } from "node:os";
import { resolve } from "node:path";

export interface ChromeProcessManagerOptions {
  chromePath?: string;
  remoteDebuggingPort?: number;
  userDataDir?: string;
  startupTimeoutMs?: number;
}

export class ChromeProcessManager {
  readonly remoteDebuggingPort: number;
  readonly userDataDir: string;
  private readonly chromePath?: string;
  private readonly startupTimeoutMs: number;
  private process?: ChildProcess;

  constructor(options: ChromeProcessManagerOptions = {}) {
    this.chromePath = options.chromePath ?? process.env.NAVIGATOR_CHROME_PATH;
    this.remoteDebuggingPort = Number(
      options.remoteDebuggingPort ?? process.env.NAVIGATOR_CDP_PORT ?? 9222
    );
    this.userDataDir =
      options.userDataDir ?? process.env.NAVIGATOR_CHROME_PROFILE_DIR ?? resolve(process.cwd(), "navigator-profile");
    this.startupTimeoutMs = options.startupTimeoutMs ?? 15_000;
  }

  async ensureRunning(): Promise<void> {
    if (await this.isReachable()) {
      return;
    }

    await mkdir(this.userDataDir, { recursive: true });
    const executable = this.chromePath ?? resolveChromeExecutable();
    const args = [
      `--remote-debugging-port=${this.remoteDebuggingPort}`,
      `--user-data-dir=${this.userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-popup-blocking",
      "about:blank"
    ];

    this.process = spawn(executable, args, {
      detached: true,
      stdio: "ignore"
    });
    this.process.unref();

    await this.waitUntilReachable();
  }

  async isReachable(): Promise<boolean> {
    try {
      const response = await fetch(this.versionUrl(), { signal: AbortSignal.timeout(1_000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  endpoint(): { host: string; port: number } {
    return {
      host: "127.0.0.1",
      port: this.remoteDebuggingPort
    };
  }

  versionUrl(): string {
    return `http://127.0.0.1:${this.remoteDebuggingPort}/json/version`;
  }

  private async waitUntilReachable(): Promise<void> {
    const deadline = Date.now() + this.startupTimeoutMs;

    while (Date.now() < deadline) {
      if (await this.isReachable()) {
        return;
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
    }

    throw new Error(`Chrome did not expose CDP at ${this.versionUrl()} within ${this.startupTimeoutMs}ms.`);
  }
}

function resolveChromeExecutable(): string {
  const currentPlatform = platform();

  if (currentPlatform === "darwin") {
    const macPath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (existsSync(macPath)) {
      return macPath;
    }
  }

  if (currentPlatform === "win32") {
    const localAppData = process.env.LOCALAPPDATA;
    const programFiles = process.env.PROGRAMFILES;
    const candidates = [
      localAppData ? `${localAppData}\\Google\\Chrome\\Application\\chrome.exe` : undefined,
      programFiles ? `${programFiles}\\Google\\Chrome\\Application\\chrome.exe` : undefined,
      "chrome.exe"
    ].filter((candidate): candidate is string => Boolean(candidate));

    return candidates.find((candidate) => existsSync(candidate)) ?? "chrome.exe";
  }

  return process.env.CHROME_BIN ?? "google-chrome";
}
