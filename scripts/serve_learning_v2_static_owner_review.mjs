import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 59690;
const HTML_HEADERS = Object.freeze({
  "cache-control": "no-store",
  "expires": "0",
  "pragma": "no-cache",
  "content-type": "text/html; charset=utf-8",
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "media-src 'self' blob: data:",
    "connect-src 'self' blob:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join("; "),
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
});

export async function startLearningV2StaticOwnerReviewServer(options = {}) {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const rootDirectory = options.rootDirectory ?? resolve(
    process.cwd(),
    ".codex-tmp",
    "learning-v2-owner-review",
  );
  const indexPath = resolve(rootDirectory, "index.html");
  await readFile(indexPath);

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://${host}`);
    if (request.method !== "GET") {
      response.writeHead(405, { allow: "GET", "cache-control": "no-store" });
      response.end("Method Not Allowed");
      return;
    }
    if (requestUrl.pathname === "/health") {
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({
        ok: true,
        service: "learning-v2-static-owner-review",
      }));
      return;
    }
    if (requestUrl.pathname !== "/" && requestUrl.pathname !== "/index.html") {
      response.writeHead(404, { "cache-control": "no-store" });
      response.end("Not Found");
      return;
    }
    try {
      const html = await readFile(indexPath);
      response.writeHead(200, HTML_HEADERS);
      response.end(html);
    } catch (error) {
      response.writeHead(503, {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
      });
      response.end("Owner review build unavailable");
      if (!options.quiet) {
        process.stderr.write(
          `LEARNING V2 OWNER REVIEW READ FAILED: ${
            error instanceof Error ? error.message : String(error)
          }\n`,
        );
      }
    }
  });

  await new Promise((resolveListen, rejectListen) => {
    const onError = (error) => rejectListen(error);
    server.once("error", onError);
    server.listen(port, host, () => {
      server.off("error", onError);
      resolveListen();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("learning_v2_owner_review_server_address_unavailable");
  }
  const url = `http://${host}:${address.port}/`;
  if (!options.quiet) {
    process.stdout.write(`LEARNING V2 OWNER REVIEW: ${url}\n`);
  }
  return Object.freeze({
    server,
    url,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    }),
  });
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isDirectRun) {
  const running = await startLearningV2StaticOwnerReviewServer();
  const shutdown = async () => {
    await running.close();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
