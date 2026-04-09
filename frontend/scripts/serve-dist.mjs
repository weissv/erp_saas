import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 80);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(currentDir, "./dist");

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function setDefaultHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("X-XSS-Protection", "1; mode=block");
}

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const normalizedPath = path.posix.normalize(decodedPath);
  const relativePath = normalizedPath.startsWith("/") ? normalizedPath.slice(1) : normalizedPath;
  const candidatePath = path.resolve(distDir, relativePath);

  if (!candidatePath.startsWith(distDir)) {
    return null;
  }

  return candidatePath;
}

async function pickFile(requestPath) {
  const filePath = resolveRequestPath(requestPath);

  if (filePath && existsSync(filePath)) {
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      return filePath;
    }
  }

  if (requestPath.startsWith("/lms")) {
    return path.join(distDir, "lms.html");
  }

  return path.join(distDir, "index.html");
}

createServer(async (request, response) => {
  if (!request.url) {
    response.writeHead(400);
    response.end("Bad Request");
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  try {
    const url = new URL(request.url, "http://localhost");
    const filePath = await pickFile(url.pathname);
    const extension = path.extname(filePath);

    setDefaultHeaders(response);
    response.setHeader("Content-Type", mimeTypes.get(extension) || "application/octet-stream");

    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      response.setHeader("Cache-Control", "no-cache");
    }

    if (request.method === "HEAD") {
      response.writeHead(200);
      response.end();
      return;
    }

    createReadStream(filePath)
      .on("error", () => {
        response.writeHead(500);
        response.end("Internal Server Error");
      })
      .pipe(response);
  } catch (error) {
    const statusCode = error && typeof error === "object" && "code" in error && error.code === "ENOENT" ? 404 : 500;
    response.writeHead(statusCode);
    response.end(statusCode === 404 ? "Not Found" : "Internal Server Error");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`[server] Serving frontend dist on port ${port}`);
});