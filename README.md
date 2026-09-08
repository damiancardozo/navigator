# Navigator

Navigator is a TypeScript platform for running declarative browser navigation workflows through a small HTTP API. Client applications describe the browser steps they want performed, submit them as jobs, and receive structured JSON results when the workflow finishes.

The project is intentionally generic. Navigator does not know about any specific website, does not contain scraping business logic, and does not interpret extracted data. It provides the browser execution layer that another application can build on top of.

## Why Navigator

Navigator is useful when an application needs browser workflows to run through a persistent, user-like browser session rather than isolated one-off scripts. It is designed for pages with complex session state, redirects, authentication, or occasional manual checkpoints, while keeping extraction logic outside the browser runtime.

Playwright and similar tools are excellent for testing and direct scripted automation. Navigator is a higher-level workflow service: it accepts declarative jobs over HTTP, queues them, runs them through a managed browser, and returns named outputs that application code can consume.

Navigator does not bypass access controls, solve captchas, hide automation, or circumvent site protections.

## What It Does

Navigator runs workflows such as:

- Open a page.
- Wait for a selector.
- Click, type, scroll, or pause.
- Extract text, HTML, attributes, images, links, existence checks, or counts.
- Return named outputs as JSON.

The first browser backend controls Google Chrome through the Chrome DevTools Protocol. Chrome is launched and managed by the agent, and workflows run against a persistent browser profile so cookies, local storage, session storage, history, and cache can persist naturally between runs.

When automation cannot continue, a job can be marked as `waiting_for_human` with a reason. Failed and `waiting_for_human` jobs also include a `pageOnError` snapshot in `result` (`url`, `title`, `html`, `text`) taken from the current tab, so clients can save the page that blocked the workflow.

## Repository Layout

This is an npm workspace with four packages:

- `@navigator/core`: workflow types, browser interfaces, runner logic, logging, and domain errors.
- `@navigator/cdp`: Chrome DevTools Protocol browser adapter and Chrome process management.
- `@navigator/agent`: Fastify HTTP service, job queue, and runtime entrypoint.
- `@navigator/sdk`: TypeScript client for submitting workflows to the HTTP API.

The `examples` directory contains sample workflow JSON and SDK usage.

## API

The agent exposes a small job API:

```http
GET /health
POST /jobs
GET /jobs/:id
```

Submit a workflow with `POST /jobs`:

```json
{
  "steps": [
    { "action": "goto", "url": "https://example.com" },
    { "action": "waitForSelector", "selector": "h1" },
    { "action": "extractText", "selector": "h1", "output": "title" }
  ]
}
```

The API immediately returns a queued job:

```json
{
  "jobId": "...",
  "status": "queued"
}
```

Fetch the job by ID to inspect its status, result, or error. If the job ends as `failed` or `waiting_for_human`, `result.pageOnError` contains the live page HTML/text at that moment.

## Workflow Actions

Implemented actions:

- `goto`
- `wait`
- `waitForSelector`
- `click`
- `type`
- `scroll`
- `evaluate`
- `extractHtml`
- `extractText`
- `extractAttribute`
- `extractAttributes`
- `extractImages`
- `extractLinks`
- `exists`
- `count`
- `sleep`
- `closeTab`

Only actions with an `output` field write to the workflow result object.

## Running Locally

Install dependencies:

```bash
npm install
```

Start the agent in development mode:

```bash
npm run dev
```

Build all packages:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Type-check the workspace:

```bash
npm run typecheck
```

## Configuration

Navigator uses the installed Google Chrome by default. Useful environment variables:

- `PORT`: HTTP port, default `3001`.
- `NAVIGATOR_CHROME_PATH`: explicit Chrome executable path.
- `NAVIGATOR_CDP_PORT`: Chrome DevTools Protocol port, default `9222`.
- `NAVIGATOR_CHROME_PROFILE_DIR`: persistent Chrome profile directory, default `./navigator-profile`.

The Chrome profile directory is intentionally ignored by git because it contains local browser state.

## Docker

The repository includes a `Dockerfile` and `docker-compose.yml` for containerized development or deployment. Build and start the service with:

```bash
docker compose up --build
```

## Example

Run the SDK example after starting the agent:

```bash
npx tsx examples/sdk-example.ts
```

Sample workflow files are available in `examples/` and can be submitted directly to the HTTP API or used as a starting point for client applications.
