import { describe, expect, it } from "vitest";
import { NavigatorClient } from "../src/index.js";

describe("NavigatorClient", () => {
  it("posts workflows to the agent", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const client = new NavigatorClient({
      baseUrl: "http://navigator.test/",
      fetchImplementation: (async (url: string | URL | Request, init?: RequestInit) => {
        requests.push({ url: String(url), init });
        return Response.json({ jobId: "job-1", status: "queued" }, { status: 202 });
      }) as typeof fetch
    });

    const response = await client.createJob({
      steps: [{ action: "goto", url: "https://example.com" }]
    });

    expect(response).toEqual({ jobId: "job-1", status: "queued" });
    expect(requests[0]?.url).toBe("http://navigator.test/jobs");
    expect(requests[0]?.init?.method).toBe("POST");
  });
});
